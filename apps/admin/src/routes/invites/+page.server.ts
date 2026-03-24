import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: invites, count } = await locals.supabase
    .from('invites')
    .select(
      `
      id,
      code,
      created_at,
      inviter:profiles!invites_inviter_user_id_fkey(full_name)
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .limit(50);

  return {
    invites:
      invites?.map((invite) => ({
        ...invite,
        inviter: Array.isArray(invite.inviter) ? (invite.inviter[0] ?? null) : invite.inviter
      })) ?? [],
    totalCount: count ?? 0
  };
};
