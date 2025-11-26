import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.getSession();

  if (!session) {
    return {
      inviteePrompt: null
    };
  }

  const { data, error } = await locals.supabase
    .from('invite_redemptions')
    .select(
      'id, invitee_user_id, redeemed_at, inviter_notified_at, invitee:profiles!invite_redemptions_invitee_user_id_fkey(full_name, role), invite:invites!inner(inviter_user_id)'
    )
    .eq('invite.inviter_user_id', session.user.id)
    .not('invitee_user_id', 'is', null)
    .is('inviter_notified_at', null)
    .order('redeemed_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Failed to load pending invite notifications', error);
  }

  const inviteRow = data ? (Array.isArray(data.invite) ? data.invite[0] : data.invite) : null;
  const inviteeProfile = data
    ? Array.isArray(data.invitee)
      ? data.invitee[0]
      : data.invitee
    : null;

  const inviteePrompt =
    inviteRow && inviteRow.inviter_user_id === session.user.id && data?.invitee_user_id
      ? {
          redemptionId: String(data.id),
          inviteeUserId: String(data.invitee_user_id),
          inviteeName:
            typeof inviteeProfile?.full_name === 'string' ? inviteeProfile.full_name : null,
          inviteeRole: typeof inviteeProfile?.role === 'string' ? inviteeProfile.role : null
        }
      : null;

  return {
    inviteePrompt
  };
};

export const actions: Actions = {
  acknowledgeInviteePrompt: async ({ request, locals }) => {
    const session = await locals.getSession();

    if (!session) {
      throw redirect(303, '/?authError=signin-required');
    }

    const formData = await request.formData();
    const redemptionId = (formData.get('redemptionId') ?? '').toString().trim();
    const intent = (formData.get('intent') ?? '').toString().trim();
    const next = (formData.get('next') ?? '').toString().trim();

    if (!redemptionId) {
      return fail(400, {
        ackError: '알림을 처리할 초대 정보를 찾지 못했습니다.'
      });
    }

    const { data, error } = await locals.supabase
      .from('invite_redemptions')
      .select('id, invite:invites!inner(inviter_user_id)')
      .eq('id', redemptionId)
      .maybeSingle();

    const inviteRow = data ? (Array.isArray(data.invite) ? data.invite[0] : data.invite) : null;

    if (error || !inviteRow || inviteRow.inviter_user_id !== session.user.id) {
      return fail(403, {
        ackError: '이 초대 알림을 확인할 권한이 없습니다.'
      });
    }

    const { error: updateError } = await locals.supabase
      .from('invite_redemptions')
      .update({ inviter_notified_at: new Date().toISOString() })
      .eq('id', redemptionId);

    if (updateError) {
      console.error('Failed to acknowledge invite redemption prompt', updateError);
      return fail(500, {
        ackError: '알림을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.'
      });
    }

    if (intent === 'visit' && next.startsWith('/')) {
      throw redirect(303, next);
    }

    return {
      success: true
    };
  }
};
