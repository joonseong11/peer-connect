import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const session = await locals.getSession();
	if (!session) {
		throw redirect(303, '/?authError=signin-required');
	}

	const supabase = locals.supabase;
	const cursor = url.searchParams.get('cursor');
	const pageSize = 20;

	let query = supabase
		.from('blog_posts')
		.select(
			'id, title, url, summary, thumbnail_url, published_at, author_id, author:profiles!blog_posts_author_id_fkey(user_id, full_name, role, photo_url)'
		)
		.order('published_at', { ascending: false })
		.limit(pageSize + 1);

	if (cursor) {
		query = query.lt('published_at', cursor);
	}

	const { data: posts, error } = await query;

	const hasMore = posts && posts.length > pageSize;
	const visiblePosts = posts?.slice(0, pageSize) ?? [];
	const nextCursor = hasMore
		? visiblePosts[visiblePosts.length - 1]?.published_at
		: null;

	return {
		posts: visiblePosts,
		nextCursor,
		loadError: error?.message ?? null
	};
};
