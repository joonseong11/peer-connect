import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: gatherings, count } = await locals.supabase
    .from('gatherings')
    .select(
      `
      id,
      title,
      date,
      location,
      created_at,
      author:profiles!author_id(full_name)
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .limit(50);

  return {
    gatherings: gatherings ?? [],
    totalCount: count ?? 0
  };
};
