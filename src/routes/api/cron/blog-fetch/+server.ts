import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSupabaseAdminClient } from '$lib/server/supabaseAdmin';
import { fetchFeed } from '$lib/server/blogFeed';

export const GET: RequestHandler = async () => {
	return handleBlogFetch();
};

export const POST: RequestHandler = async () => {
	return handleBlogFetch();
};

async function handleBlogFetch() {
	const supabase = getSupabaseAdminClient();
	if (!supabase) {
		return json({ error: 'Server configuration error' }, { status: 500 });
	}

	// Fetch all members with a blog URL
	const { data: members, error: membersError } = await supabase
		.from('profiles')
		.select('user_id, contact_blog')
		.not('contact_blog', 'is', null)
		.neq('contact_blog', '');

	if (membersError || !members) {
		return json(
			{ error: 'Failed to fetch members', detail: membersError?.message },
			{ status: 500 }
		);
	}

	let fetched = 0;
	let failed = 0;

	for (const member of members) {
		try {
			const posts = await fetchFeed(member.contact_blog);
			if (posts.length === 0) {
				failed++;
				continue;
			}

			for (const post of posts) {
				if (!post.url || !post.title) continue;

				// Upsert (skip if URL already exists)
				await supabase.from('blog_posts').upsert(
					{
						author_id: member.user_id,
						title: post.title,
						url: post.url,
						summary: post.summary,
						thumbnail_url: post.thumbnail_url,
						published_at: post.published_at,
						fetched_at: new Date().toISOString()
					},
					{ onConflict: 'url', ignoreDuplicates: true }
				);
			}

			// Prune old posts (keep latest 5 per member)
			const { data: existing } = await supabase
				.from('blog_posts')
				.select('id')
				.eq('author_id', member.user_id)
				.order('published_at', { ascending: false });

			if (existing && existing.length > 5) {
				const idsToDelete = existing.slice(5).map((p) => p.id);
				await supabase.from('blog_posts').delete().in('id', idsToDelete);
			}

			fetched++;
		} catch {
			failed++;
		}
	}

	return json({ success: true, fetched, failed, total: members.length });
}
