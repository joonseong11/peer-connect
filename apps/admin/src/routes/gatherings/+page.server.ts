import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: gatherings, count } = await locals.supabase
    .from('gatherings')
    .select(
      `
      id,
      title,
      content,
      email_sent,
      created_at,
      author:profiles!gatherings_author_id_fkey(full_name)
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .limit(50);

  return {
    gatherings:
      gatherings?.map((gathering) => ({
        ...gathering,
        author: Array.isArray(gathering.author) ? (gathering.author[0] ?? null) : gathering.author
      })) ?? [],
    totalCount: count ?? 0
  };
};
