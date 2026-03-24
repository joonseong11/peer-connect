import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: endorsements, count } = await locals.supabase
    .from('endorsements')
    .select(
      `
      id,
      content,
      created_at,
      author:profiles!author_id(full_name),
      target:profiles!target_id(full_name)
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .limit(50);

  return {
    endorsements: endorsements ?? [],
    totalCount: count ?? 0
  };
};
