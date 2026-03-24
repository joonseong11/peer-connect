import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const supabase = locals.supabase;

  const [membersResult, endorsementsResult, gatheringsResult, blogResult] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('endorsements').select('id', { count: 'exact', head: true }),
    supabase.from('gatherings').select('id', { count: 'exact', head: true }),
    supabase.from('blog_posts').select('id', { count: 'exact', head: true })
  ]);

  return {
    stats: {
      members: membersResult.count ?? 0,
      endorsements: endorsementsResult.count ?? 0,
      gatherings: gatheringsResult.count ?? 0,
      blogPosts: blogResult.count ?? 0
    }
  };
};
