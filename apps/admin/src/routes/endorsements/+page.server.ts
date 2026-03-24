import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: endorsements, count } = await locals.supabase
    .from('endorsements')
    .select(
      `
      id,
      content,
      created_at,
      author:profiles!endorsements_author_id_fkey(full_name),
      target:profiles!endorsements_target_user_id_fkey(full_name)
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .limit(50);

  return {
    endorsements:
      endorsements?.map((endorsement) => ({
        ...endorsement,
        author: Array.isArray(endorsement.author) ? (endorsement.author[0] ?? null) : endorsement.author,
        target: Array.isArray(endorsement.target) ? (endorsement.target[0] ?? null) : endorsement.target
      })) ?? [],
    totalCount: count ?? 0
  };
};
