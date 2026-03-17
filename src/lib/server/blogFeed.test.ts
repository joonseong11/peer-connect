import { describe, it, expect } from 'vitest';
import { parseRssFeed, stripHtml, discoverFeedUrl, isUrlSafe } from './blogFeed';

describe('stripHtml', () => {
	it('removes HTML tags', () => {
		expect(stripHtml('<p>Hello <b>world</b></p>')).toBe('Hello world');
	});

	it('decodes HTML entities', () => {
		expect(stripHtml('A &amp; B &lt; C')).toBe('A & B < C');
	});

	it('truncates to maxLength', () => {
		const long = 'a'.repeat(300);
		expect(stripHtml(long, 200).length).toBe(200);
	});
});

describe('isUrlSafe', () => {
	it('allows HTTPS URLs', () => {
		expect(isUrlSafe('https://velog.io/@user')).toBe(true);
	});

	it('rejects HTTP URLs', () => {
		expect(isUrlSafe('http://example.com')).toBe(false);
	});

	it('rejects private IPs', () => {
		expect(isUrlSafe('https://127.0.0.1')).toBe(false);
		expect(isUrlSafe('https://10.0.0.1')).toBe(false);
		expect(isUrlSafe('https://192.168.1.1')).toBe(false);
		expect(isUrlSafe('https://172.16.0.1')).toBe(false);
		expect(isUrlSafe('https://169.254.169.254')).toBe(false);
	});

	it('rejects non-HTTPS protocols', () => {
		expect(isUrlSafe('file:///etc/passwd')).toBe(false);
		expect(isUrlSafe('ftp://server.com')).toBe(false);
	});
});

describe('discoverFeedUrl', () => {
	it('converts velog URL to RSS', () => {
		expect(discoverFeedUrl('https://velog.io/@username')).toBe('https://velog.io/rss/@username');
	});

	it('converts tistory URL to RSS', () => {
		expect(discoverFeedUrl('https://myblog.tistory.com')).toBe(
			'https://myblog.tistory.com/rss'
		);
	});

	it('converts medium URL to RSS', () => {
		expect(discoverFeedUrl('https://medium.com/@user')).toBe('https://medium.com/feed/@user');
	});

	it('returns common feed paths for unknown domains', () => {
		const urls = discoverFeedUrl('https://myblog.dev');
		expect(urls).toContain('https://myblog.dev/rss');
		expect(urls).toContain('https://myblog.dev/feed');
		expect(urls).toContain('https://myblog.dev/feed.xml');
	});
});

describe('parseRssFeed', () => {
	it('parses RSS 2.0 feed', () => {
		const xml = `<?xml version="1.0"?>
    <rss version="2.0">
      <channel>
        <item>
          <title>My Post</title>
          <link>https://blog.com/post-1</link>
          <description><![CDATA[<p>Summary here</p>]]></description>
          <pubDate>Mon, 17 Mar 2026 00:00:00 GMT</pubDate>
        </item>
      </channel>
    </rss>`;
		const posts = parseRssFeed(xml);
		expect(posts).toHaveLength(1);
		expect(posts[0].title).toBe('My Post');
		expect(posts[0].url).toBe('https://blog.com/post-1');
		expect(posts[0].summary).toBe('Summary here');
	});

	it('parses Atom feed', () => {
		const xml = `<?xml version="1.0"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      <entry>
        <title>Atom Post</title>
        <link href="https://blog.com/atom-1" />
        <summary>Atom summary</summary>
        <published>2026-03-17T00:00:00Z</published>
      </entry>
    </feed>`;
		const posts = parseRssFeed(xml);
		expect(posts).toHaveLength(1);
		expect(posts[0].title).toBe('Atom Post');
		expect(posts[0].url).toBe('https://blog.com/atom-1');
	});

	it('returns empty array for invalid XML', () => {
		expect(parseRssFeed('not xml')).toEqual([]);
	});

	it('limits to 5 posts', () => {
		const items = Array.from(
			{ length: 10 },
			(_, i) => `
      <item>
        <title>Post ${i}</title>
        <link>https://blog.com/post-${i}</link>
        <pubDate>Mon, ${10 + i} Mar 2026 00:00:00 GMT</pubDate>
      </item>`
		).join('');
		const xml = `<?xml version="1.0"?><rss version="2.0"><channel>${items}</channel></rss>`;
		const posts = parseRssFeed(xml);
		expect(posts.length).toBeLessThanOrEqual(5);
	});
});
