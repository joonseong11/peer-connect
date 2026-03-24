import { XMLParser } from 'fast-xml-parser';

export interface BlogPost {
	title: string;
	url: string;
	summary: string | null;
	thumbnail_url: string | null;
	published_at: string;
}

const PRIVATE_IP_PATTERNS = [
	/^127\./,
	/^10\./,
	/^172\.(1[6-9]|2\d|3[01])\./,
	/^192\.168\./,
	/^169\.254\./,
	/^0\./,
	/^localhost$/i
];

export function isUrlSafe(url: string): boolean {
	try {
		const parsed = new URL(url);
		if (parsed.protocol !== 'https:') return false;
		const hostname = parsed.hostname;
		if (PRIVATE_IP_PATTERNS.some((p) => p.test(hostname))) return false;
		return true;
	} catch {
		return false;
	}
}

export function stripHtml(html: string, maxLength = 200): string {
	let text = html
		.replace(/<[^>]*>/g, '')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&nbsp;/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	if (text.length > maxLength) {
		text = text.slice(0, maxLength);
	}
	return text;
}

export function discoverFeedUrl(blogUrl: string): string | string[] {
	const url = blogUrl.replace(/\/+$/, '');

	const velogMatch = url.match(/^https:\/\/velog\.io\/@(.+)/);
	if (velogMatch) return `https://velog.io/rss/@${velogMatch[1]}`;

	const tistoryMatch = url.match(/^https:\/\/(.+)\.tistory\.com/);
	if (tistoryMatch) return `${url}/rss`;

	const mediumMatch = url.match(/^https:\/\/medium\.com\/(@.+)/);
	if (mediumMatch) return `https://medium.com/feed/${mediumMatch[1]}`;

	return [
		`${url}/rss`,
		`${url}/feed`,
		`${url}/feed.xml`,
		`${url}/atom.xml`,
		`${url}/rss.xml`,
		`${url}/index.xml`
	];
}

export function parseRssFeed(xml: string): BlogPost[] {
	try {
		const parser = new XMLParser({
			ignoreAttributes: false,
			attributeNamePrefix: '@_'
		});
		const parsed = parser.parse(xml);

		// RSS 2.0
		const channel = parsed?.rss?.channel;
		if (channel) {
			const items = Array.isArray(channel.item)
				? channel.item
				: channel.item
					? [channel.item]
					: [];
			return items.slice(0, 5).map((item: Record<string, unknown>) => ({
				title: String(item.title ?? ''),
				url: String(item.link ?? ''),
				summary: item.description ? stripHtml(String(item.description)) : null,
				thumbnail_url: extractThumbnail(item),
				published_at: item.pubDate
					? new Date(String(item.pubDate)).toISOString()
					: new Date().toISOString()
			}));
		}

		// Atom
		const feed = parsed?.feed;
		if (feed) {
			const entries = Array.isArray(feed.entry)
				? feed.entry
				: feed.entry
					? [feed.entry]
					: [];
			return entries.slice(0, 5).map((entry: Record<string, unknown>) => ({
				title: String(entry.title ?? ''),
				url: extractAtomLink(entry),
				summary: entry.summary ? stripHtml(String(entry.summary)) : null,
				thumbnail_url: null,
				published_at: entry.published
					? new Date(String(entry.published)).toISOString()
					: entry.updated
						? new Date(String(entry.updated)).toISOString()
						: new Date().toISOString()
			}));
		}

		return [];
	} catch {
		return [];
	}
}

function extractAtomLink(entry: Record<string, unknown>): string {
	const link = entry.link;
	if (typeof link === 'string') return link;
	if (link && typeof link === 'object' && '@_href' in (link as Record<string, unknown>)) {
		return String((link as Record<string, string>)['@_href']);
	}
	if (Array.isArray(link)) {
		const alt = link.find(
			(l: Record<string, string>) => l['@_rel'] === 'alternate' || !l['@_rel']
		);
		if (alt && '@_href' in alt) return String(alt['@_href']);
	}
	return '';
}

function extractThumbnail(item: Record<string, unknown>): string | null {
	const enclosure = item.enclosure as Record<string, string> | undefined;
	if (enclosure?.['@_type']?.startsWith('image/') && enclosure['@_url']) {
		return enclosure['@_url'];
	}
	const mediaThumbnail = item['media:thumbnail'] as Record<string, string> | undefined;
	if (mediaThumbnail?.['@_url']) {
		return mediaThumbnail['@_url'];
	}
	return null;
}

export async function fetchFeed(blogUrl: string): Promise<BlogPost[]> {
	const candidates = discoverFeedUrl(blogUrl);
	const urls = Array.isArray(candidates) ? candidates : [candidates];

	for (const feedUrl of urls) {
		if (!isUrlSafe(feedUrl)) continue;
		try {
			const res = await fetch(feedUrl, {
				signal: AbortSignal.timeout(10_000),
				headers: { 'User-Agent': 'PeerConnect/1.0 RSS Reader' },
				redirect: 'follow'
			});
			if (!res.ok) continue;

			const contentLength = res.headers.get('content-length');
			if (contentLength && parseInt(contentLength) > 1_000_000) continue;

			const text = await res.text();
			if (text.length > 1_000_000) continue;

			const posts = parseRssFeed(text);
			if (posts.length > 0) return posts;
		} catch {
			continue;
		}
	}
	return [];
}
