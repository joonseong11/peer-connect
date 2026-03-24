import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: invites, count } = await locals.supabase
    .from('invites')
    .select(
      `
      id,
      code,
      created_at,
      inviter:profiles!inviter_id(full_name)
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .limit(50);

  return {
    invites: invites ?? [],
    totalCount: count ?? 0
  };
};
