import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: posts, count } = await locals.supabase
    .from('blog_posts')
    .select('id, title, url, author_name, published_at, fetched_at', { count: 'exact' })
    .order('published_at', { ascending: false })
    .limit(50);

  return {
    posts: posts ?? [],
    totalCount: count ?? 0
  };
};
