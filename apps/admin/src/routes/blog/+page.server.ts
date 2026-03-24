import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: posts, count } = await locals.supabase
    .from('blog_posts')
    .select(
      'id, title, url, author_id, published_at, fetched_at, author:profiles!blog_posts_author_id_fkey(full_name)',
      { count: 'exact' }
    )
    .order('published_at', { ascending: false })
    .limit(50);

  return {
    posts:
      posts?.map((post) => ({
        ...post,
        author: Array.isArray(post.author) ? (post.author[0] ?? null) : post.author
      })) ?? [],
    totalCount: count ?? 0
  };
};
