import { fail, redirect } from '@sveltejs/kit';
import {
  buildExternalEndorsementClaimPath,
  finalizeExternalEndorsementClaim,
  getExternalEndorsementClaimPreview,
  type ExternalEndorsementClaimState,
  type ExternalEndorsementClaimStatusReason
} from '$lib/server/externalEndorsement';
import type { Actions, PageServerLoad } from './$types';

const PENDING_CLAIM_COOKIE = 'pending_claim_token';

const cookieOptions = {
  path: '/',
  maxAge: 60 * 60,
  httpOnly: true,
  sameSite: 'lax' as const
};

const toStatusParam = (reason: ExternalEndorsementClaimStatusReason) => {
  switch (reason) {
    case 'claimed':
      return 'claimed';
    case 'revoked':
      return 'revoked';
    case 'expired':
      return 'expired';
    case 'self-claim-not-allowed':
      return 'self-claim-not-allowed';
    case 'server-unavailable':
      return 'server-unavailable';
    case 'generic':
      return 'generic';
    default:
      return 'invalid';
  }
};

const buildClaimStatusMessage = (status: string | null, previewState: ExternalEndorsementClaimState | null) => {
  const effectiveStatus =
    status ??
    (previewState === 'claimed'
      ? 'claimed'
      : previewState === 'revoked'
        ? 'revoked'
        : previewState === 'expired'
          ? 'expired'
          : null);

  switch (effectiveStatus) {
    case 'claimed':
      return '이 추천 링크는 이미 수령되었습니다.';
    case 'revoked':
      return '작성자가 이 추천 링크를 철회했습니다.';
    case 'expired':
      return '이 추천 링크는 만료되었습니다.';
    case 'self-claim-not-allowed':
      return '내가 만든 추천 링크는 내 계정으로 받을 수 없습니다.';
    case 'server-unavailable':
      return '지금은 추천 링크를 처리할 수 없습니다. 잠시 후 다시 시도해주세요.';
    case 'generic':
      return '추천 링크를 처리하지 못했습니다. 잠시 후 다시 시도해주세요.';
    case 'invalid':
      return '추천 링크를 확인할 수 없습니다.';
    default:
      return null;
  }
};

const buildRecipientRedirect = (outcome: 'claimed' | 'already-linked') =>
  `/mypage/profile?claimStatus=${outcome === 'claimed' ? 'claimed' : 'already-linked'}`;

const createLoginRedirect = (token: string) =>
  `/auth/login?next=${encodeURIComponent(`${buildExternalEndorsementClaimPath(token)}?claim=continue`)}`;

export const load: PageServerLoad = async ({ locals, params, cookies, url }) => {
  const token = params.token;
  const session = await locals.getSession();
  const pendingClaimToken = cookies.get(PENDING_CLAIM_COOKIE);
  const previewResult = await getExternalEndorsementClaimPreview({ token });

  if (session && url.searchParams.get('claim') === 'continue' && pendingClaimToken === token) {
    cookies.delete(PENDING_CLAIM_COOKIE, { path: '/' });

    if (!previewResult.success) {
      throw redirect(
        303,
        `${buildExternalEndorsementClaimPath(token)}?status=${encodeURIComponent(
          toStatusParam(previewResult.reason)
        )}`
      );
    }

    if (previewResult.preview.state !== 'active') {
      throw redirect(
        303,
        `${buildExternalEndorsementClaimPath(token)}?status=${encodeURIComponent(
          previewResult.preview.state
        )}`
      );
    }

    const finalizeResult = await finalizeExternalEndorsementClaim({
      token,
      claimantUserId: session.user.id
    });

    if (finalizeResult.success) {
      throw redirect(303, buildRecipientRedirect(finalizeResult.outcome));
    }

    throw redirect(
      303,
      `${buildExternalEndorsementClaimPath(token)}?status=${encodeURIComponent(
        toStatusParam(finalizeResult.reason)
      )}`
    );
  }

  const preview = previewResult.success ? previewResult.preview : null;

  return {
    session,
    token,
    preview,
    statusMessage: buildClaimStatusMessage(url.searchParams.get('status'), preview?.state ?? null),
    warningLabel:
      '나는 이 추천서를 받을 당사자라고 판단하며, 타인을 대신해 수령하지 않습니다. 잘못 수령할 경우 추천서 회수, 연결 해제, 서비스 이용 제한 또는 별도 통지 없는 계정 삭제 등 불이익이 있을 수 있음을 이해했습니다.'
  };
};

export const actions: Actions = {
  claim: async ({ locals, params, request, cookies }) => {
    const token = params.token;
    const previewResult = await getExternalEndorsementClaimPreview({ token });

    if (!previewResult.success) {
      return fail(400, {
        claimError: buildClaimStatusMessage(toStatusParam(previewResult.reason), null)
      });
    }

    if (previewResult.preview.state !== 'active') {
      return fail(400, {
        claimError: buildClaimStatusMessage(null, previewResult.preview.state)
      });
    }

    const formData = await request.formData();
    const warningAccepted =
      formData.get('warningAccepted') === 'on' || formData.get('warningAccepted') === 'true';

    if (!warningAccepted) {
      return fail(400, {
        claimError: '경고 내용을 확인한 후에만 추천서를 받을 수 있습니다.'
      });
    }

    const session = await locals.getSession();

    if (!session) {
      cookies.set(PENDING_CLAIM_COOKIE, token, cookieOptions);
      throw redirect(303, createLoginRedirect(token));
    }

    const finalizeResult = await finalizeExternalEndorsementClaim({
      token,
      claimantUserId: session.user.id
    });

    if (!finalizeResult.success) {
      return fail(finalizeResult.reason === 'generic' || finalizeResult.reason === 'server-unavailable' ? 500 : 400, {
        claimError: buildClaimStatusMessage(toStatusParam(finalizeResult.reason), null)
      });
    }

    cookies.delete(PENDING_CLAIM_COOKIE, { path: '/' });
    throw redirect(303, buildRecipientRedirect(finalizeResult.outcome));
  }
};
