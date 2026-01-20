import { INVITE_FALLBACK_CODE } from '$lib/config';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

export type RedeemErrorReason = 'invalid' | 'already-used' | 'already-linked' | 'generic';

export type RedeemResult =
  | { success: true; redirectTo: string }
  | { success: false; status: number; message: string; reason: RedeemErrorReason };

export const mapRedeemReasonToStatus = (reason: RedeemErrorReason) => {
  switch (reason) {
    case 'already-used':
      return 'redeem-used';
    case 'already-linked':
      return 'redeem-linked';
    case 'invalid':
      return 'invalid';
    default:
      return 'redeem-error';
  }
};

export const normalizeCode = (code: string) => code.trim().toUpperCase();

export const redeemInviteCode = async ({
  supabase,
  session,
  code
}: {
  supabase: SupabaseClient;
  session: Session;
  code: string;
}): Promise<RedeemResult> => {
  const normalizedCode = normalizeCode(code);

  if (!normalizedCode) {
    return {
      success: false,
      status: 400,
      message: '초대 코드를 입력해주세요.',
      reason: 'invalid'
    };
  }

  const { data: existingRedeemed } = await supabase
    .from('invite_redemptions')
    .select('id')
    .eq('invitee_user_id', session.user.id)
    .maybeSingle();

  if (existingRedeemed) {
    return {
      success: false,
      status: 400,
      message: '이미 초대 코드와 연결되어 있습니다.',
      reason: 'already-linked'
    };
  }

  if (INVITE_FALLBACK_CODE && normalizedCode === INVITE_FALLBACK_CODE) {
    const { count: totalRedemptions } = await supabase
      .from('invite_redemptions')
      .select('id', { count: 'exact', head: true });

    if ((totalRedemptions ?? 0) > 0) {
      return {
        success: false,
        status: 400,
        message: '이미 사용된 초대 코드입니다.',
        reason: 'already-used'
      };
    }

    const { data: existingFallbackInvite, error: fallbackLookupError } = await supabase
      .from('invites')
      .select('id, deactivated_at')
      .eq('code', normalizedCode)
      .maybeSingle();

    if (fallbackLookupError) {
      console.error('Failed to lookup fallback invite', fallbackLookupError);
      return {
        success: false,
        status: 500,
        message: '초대 코드를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.',
        reason: 'generic'
      };
    }

    let fallbackInviteId = existingFallbackInvite?.id ? String(existingFallbackInvite.id) : null;

    if (!fallbackInviteId) {
      const { data: insertedFallback, error: insertFallbackError } = await supabase
        .from('invites')
        .insert({
          code: normalizedCode,
          inviter_user_id: null,
          slot_index: 0,
          max_redemptions: 1,
          beta_unlimited: false
        })
        .select('id')
        .single();

      if (insertFallbackError) {
        console.error('Failed to create fallback invite', insertFallbackError);
        return {
          success: false,
          status: 500,
          message: '초대 코드를 생성하지 못했습니다. 잠시 후 다시 시도해주세요.',
          reason: 'generic'
        };
      }

      fallbackInviteId = String(insertedFallback.id);
    }

    const { count: fallbackUsageCount } = await supabase
      .from('invite_redemptions')
      .select('id', { head: true, count: 'exact' })
      .eq('invite_id', fallbackInviteId);

    if ((fallbackUsageCount ?? 0) > 0) {
      return {
        success: false,
        status: 400,
        message: '이미 사용된 초대 코드입니다.',
        reason: 'already-used'
      };
    }

    const { error: fallbackRedeemError } = await supabase.from('invite_redemptions').insert({
      invite_id: fallbackInviteId,
      invitee_user_id: session.user.id
    });

    if (fallbackRedeemError) {
      console.error('Failed to redeem fallback invite', fallbackRedeemError);
      return {
        success: false,
        status: 500,
        message: '초대 코드를 연결하지 못했습니다. 잠시 후 다시 시도해주세요.',
        reason: 'generic'
      };
    }

    const nowIso = new Date().toISOString();
    const { error: fallbackDeactivateError } = await supabase
      .from('invites')
      .update({ deactivated_at: nowIso })
      .eq('id', fallbackInviteId)
      .is('deactivated_at', null);

    if (fallbackDeactivateError) {
      console.error('Failed to deactivate fallback invite', fallbackDeactivateError);
    }

    return {
      success: true,
      redirectTo: '/profile?onboarding=seed'
    };
  }

  const { data: invite, error: inviteError } = await supabase
    .from('invites')
    .select(
      'id, code, inviter_user_id, slot_index, max_redemptions, beta_unlimited, deactivated_at, invite_redemptions(id)'
    )
    .eq('code', normalizedCode)
    .maybeSingle();

  if (inviteError) {
    console.error('Failed to lookup invite by code', inviteError);
    return {
      success: false,
      status: 500,
      message: '초대 코드를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.',
      reason: 'generic'
    };
  }

  if (!invite) {
    return {
      success: false,
      status: 400,
      message: '초대 코드를 찾을 수 없습니다.',
      reason: 'invalid'
    };
  }

  const redemptionCount = invite.invite_redemptions?.length ?? 0;
  const isUnlimited =
    invite.beta_unlimited || invite.max_redemptions === null || (invite.max_redemptions ?? 0) < 0;
  const maxRedemptions = invite.max_redemptions ?? null;

  if (
    !isUnlimited &&
    ((maxRedemptions !== null && redemptionCount >= maxRedemptions) ||
      Boolean(invite.deactivated_at))
  ) {
    return {
      success: false,
      status: 400,
      message: '이미 사용된 초대 코드입니다.',
      reason: 'already-used'
    };
  }

  const { error: insertError } = await supabase.from('invite_redemptions').insert({
    invite_id: invite.id,
    invitee_user_id: session.user.id
  });

  if (insertError) {
    console.error('Failed to redeem invite', insertError);
    return {
      success: false,
      status: 500,
      message: '초대 코드를 연결하지 못했습니다. 이미 사용되었을 수 있어요.',
      reason: 'generic'
    };
  }

  if (!isUnlimited && maxRedemptions !== null) {
    const usesAfter = redemptionCount + 1;
    if (usesAfter >= maxRedemptions) {
      const nowIso = new Date().toISOString();
      const { error: deactivateError } = await supabase
        .from('invites')
        .update({ deactivated_at: nowIso })
        .eq('id', invite.id)
        .is('deactivated_at', null);

      if (deactivateError) {
        console.error('Failed to deactivate invite after redemption', deactivateError);
      }
    }
  }

  if (!invite.inviter_user_id) {
    return {
      success: false,
      status: 500,
      message: '초대한 사용자를 찾을 수 없습니다.',
      reason: 'generic'
    };
  }

  return {
    success: true,
    redirectTo: `/members/${invite.inviter_user_id}?endorsementStatus=prompt`
  };
};
