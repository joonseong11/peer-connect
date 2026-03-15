import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdminClient } from './supabaseAdmin';

export type ExternalEndorsementClaimState = 'active' | 'claimed' | 'revoked' | 'expired';

export type ExternalEndorsementClaimStatusReason =
  | 'not-found'
  | 'claimed'
  | 'revoked'
  | 'expired'
  | 'invite-quota-exhausted'
  | 'self-claim-not-allowed'
  | 'server-unavailable'
  | 'generic';

type ExternalEndorsementClaimRow = {
  id: string;
  author_id: string;
  author_name_snapshot: string;
  content: string;
  claim_token_hash: string;
  hidden_invite_id: string | null;
  status: 'active' | 'claimed' | 'revoked';
  claimed_by_user_id: string | null;
  materialized_endorsement_id: string | null;
  expires_at: string;
  claimed_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
};

type ExternalEndorsementClaimPreviewRow = Pick<
  ExternalEndorsementClaimRow,
  'id' | 'author_id' | 'author_name_snapshot' | 'status' | 'expires_at' | 'claimed_at' | 'revoked_at'
>;

const getAdminClient = (client?: SupabaseClient | null) => client ?? getSupabaseAdminClient();

const now = () => new Date();

const toIso = (value: Date) => value.toISOString();

export const hashExternalEndorsementClaimToken = (token: string) =>
  createHash('md5').update(token).digest('hex');

export const buildExternalEndorsementClaimPath = (token: string) =>
  `/claim/${encodeURIComponent(token)}`;

export const resolveExternalEndorsementClaimState = (
  claim: Pick<ExternalEndorsementClaimPreviewRow, 'status' | 'expires_at'>,
  currentDate = now()
): ExternalEndorsementClaimState => {
  if (claim.status === 'claimed') {
    return 'claimed';
  }

  if (claim.status === 'revoked') {
    return 'revoked';
  }

  return new Date(claim.expires_at).getTime() < currentDate.getTime() ? 'expired' : 'active';
};

export const createExternalEndorsementClaim = async ({
  authorId,
  authorName,
  content,
  quota,
  adminClient
}: {
  authorId: string;
  authorName: string;
  content: string;
  quota?: number | null;
  adminClient?: SupabaseClient | null;
}) => {
  const admin = getAdminClient(adminClient);

  if (!admin) {
    return {
      success: false as const,
      reason: 'server-unavailable' as const,
      message: '추천 링크 기능을 준비하지 못했습니다. 잠시 후 다시 시도해주세요.'
    };
  }

  const { data, error } = await admin.rpc('create_external_endorsement_claim', {
    p_author: authorId,
    p_author_name: authorName,
    p_content: content,
    p_quota: quota ?? null
  });

  if (error) {
    const normalizedMessage = error.message.toLowerCase();
    if (normalizedMessage.includes('invite_quota_exhausted')) {
      return {
        success: false as const,
        reason: 'invite-quota-exhausted' as const,
        message:
          '사용 가능한 초대 권한이 없어 추천 링크를 만들 수 없습니다. 기존 초대권이나 추천 링크 사용 현황을 먼저 확인해주세요.'
      };
    }

    console.error('[external-endorsements] Failed to create claim via RPC', error);
    return {
      success: false as const,
      reason: 'generic' as const,
      message: '추천 링크를 생성하지 못했습니다. 잠시 후 다시 시도해주세요.'
    };
  }

  const claim = Array.isArray(data) ? data[0] : data;

  if (!claim?.id) {
    return {
      success: false as const,
      reason: 'generic' as const,
      message: '추천 링크를 생성하지 못했습니다. 잠시 후 다시 시도해주세요.'
    };
  }

  return {
    success: true as const,
    claim: {
      id: String(claim.id),
      token: String(claim.token),
      status: String(claim.status) as ExternalEndorsementClaimState,
      expiresAt: String(claim.expires_at),
      createdAt: String(claim.created_at)
    }
  };
};

export const getExternalEndorsementClaimPreview = async ({
  token,
  adminClient
}: {
  token: string;
  adminClient?: SupabaseClient | null;
}) => {
  const admin = getAdminClient(adminClient);

  if (!admin) {
    return {
      success: false as const,
      reason: 'server-unavailable' as const
    };
  }

  const { data, error } = await admin
    .from('external_endorsement_claims')
    .select('id, author_id, author_name_snapshot, status, expires_at, claimed_at, revoked_at')
    .eq('claim_token_hash', hashExternalEndorsementClaimToken(token))
    .maybeSingle();

  if (error) {
    console.error('[external-endorsements] Failed to load claim preview', error);
    return {
      success: false as const,
      reason: 'generic' as const
    };
  }

  if (!data) {
    return {
      success: false as const,
      reason: 'not-found' as const
    };
  }

  const preview = data as ExternalEndorsementClaimPreviewRow;

  return {
    success: true as const,
    preview: {
      id: String(preview.id),
      authorId: String(preview.author_id),
      authorName: String(preview.author_name_snapshot),
      state: resolveExternalEndorsementClaimState(preview),
      expiresAt: String(preview.expires_at),
      claimedAt: preview.claimed_at ? String(preview.claimed_at) : null,
      revokedAt: preview.revoked_at ? String(preview.revoked_at) : null
    }
  };
};

export const revokeExternalEndorsementClaim = async ({
  claimId,
  authorId,
  adminClient
}: {
  claimId: string;
  authorId: string;
  adminClient?: SupabaseClient | null;
}) => {
  const admin = getAdminClient(adminClient);

  if (!admin) {
    return {
      success: false as const,
      reason: 'server-unavailable' as const,
      message: '추천 링크 기능을 준비하지 못했습니다. 잠시 후 다시 시도해주세요.'
    };
  }

  const { data, error } = await admin
    .from('external_endorsement_claims')
    .select('id, author_id, hidden_invite_id, status, expires_at')
    .eq('id', claimId)
    .maybeSingle();

  if (error) {
    console.error('[external-endorsements] Failed to lookup claim for revoke', error);
    return {
      success: false as const,
      reason: 'generic' as const,
      message: '추천 링크를 철회하지 못했습니다. 잠시 후 다시 시도해주세요.'
    };
  }

  if (!data || String(data.author_id) !== authorId) {
    return {
      success: false as const,
      reason: 'not-found' as const,
      message: '철회할 추천 링크를 찾을 수 없습니다.'
    };
  }

  const state = resolveExternalEndorsementClaimState({
    status: data.status,
    expires_at: data.expires_at
  });

  if (state !== 'active') {
    return {
      success: false as const,
      reason: state,
      message:
        state === 'claimed'
          ? '이미 수령된 추천 링크는 철회할 수 없습니다.'
          : '이미 비활성화된 추천 링크입니다.'
    };
  }

  const timestamp = toIso(now());
  const { error: updateError } = await admin
    .from('external_endorsement_claims')
    .update({
      status: 'revoked',
      revoked_at: timestamp,
      updated_at: timestamp
    })
    .eq('id', claimId);

  if (updateError) {
    console.error('[external-endorsements] Failed to revoke claim', updateError);
    return {
      success: false as const,
      reason: 'generic' as const,
      message: '추천 링크를 철회하지 못했습니다. 잠시 후 다시 시도해주세요.'
    };
  }

  if (data.hidden_invite_id) {
    const { error: cleanupInviteError } = await admin
      .from('invites')
      .delete()
      .eq('id', data.hidden_invite_id);

    if (cleanupInviteError) {
      console.error(
        '[external-endorsements] Failed to clean up hidden invite during revoke',
        cleanupInviteError
      );
    }
  }

  return {
    success: true as const
  };
};

export const finalizeExternalEndorsementClaim = async ({
  token,
  claimantUserId,
  adminClient
}: {
  token: string;
  claimantUserId: string;
  adminClient?: SupabaseClient | null;
}) => {
  const admin = getAdminClient(adminClient);

  if (!admin) {
    return {
      success: false as const,
      reason: 'server-unavailable' as const
    };
  }

  const { data, error } = await admin.rpc('claim_external_endorsement', {
    p_token: token,
    p_claimant: claimantUserId
  });

  if (error) {
    const normalizedMessage = error.message.toLowerCase();
    if (normalizedMessage.includes('claim_not_found')) {
      return { success: false as const, reason: 'not-found' as const };
    }
    if (normalizedMessage.includes('claim_already_claimed')) {
      return { success: false as const, reason: 'claimed' as const };
    }
    if (normalizedMessage.includes('claim_revoked')) {
      return { success: false as const, reason: 'revoked' as const };
    }
    if (normalizedMessage.includes('claim_expired')) {
      return { success: false as const, reason: 'expired' as const };
    }
    if (normalizedMessage.includes('claim_self_not_allowed')) {
      return { success: false as const, reason: 'self-claim-not-allowed' as const };
    }

    console.error('[external-endorsements] Failed to finalize claim via RPC', error);
    return {
      success: false as const,
      reason: 'generic' as const
    };
  }

  const result = Array.isArray(data) ? data[0] : data;

  if (!result) {
    return {
      success: false as const,
      reason: 'generic' as const
    };
  }

  return {
    success: true as const,
    outcome:
      result.outcome === 'claimed' ? ('claimed' as const) : ('already-linked' as const),
    claimId: String(result.claim_id),
    endorsementId: String(result.endorsement_id)
  };
};
