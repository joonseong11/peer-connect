import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFormRequest, expectRedirect } from '../../../test/support/sveltekit';

const { getExternalEndorsementClaimPreview, finalizeExternalEndorsementClaim } = vi.hoisted(() => ({
  getExternalEndorsementClaimPreview: vi.fn(),
  finalizeExternalEndorsementClaim: vi.fn()
}));

vi.mock('$lib/server/externalEndorsement', () => ({
  buildExternalEndorsementClaimPath: (token: string) => `/claim/${token}`,
  getExternalEndorsementClaimPreview,
  finalizeExternalEndorsementClaim
}));

const createCookies = (initial: Record<string, string> = {}) => {
  const store = new Map(Object.entries(initial));

  return {
    get: vi.fn((name: string) => store.get(name)),
    set: vi.fn((name: string, value: string) => {
      store.set(name, value);
    }),
    delete: vi.fn((name: string) => {
      store.delete(name);
    })
  };
};

describe('/claim/[token]', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getExternalEndorsementClaimPreview.mockResolvedValue({
      success: true,
      preview: {
        id: 'claim-1',
        authorId: 'author-1',
        authorName: '추천인',
        token: 'claim-token-1',
        state: 'active',
        expiresAt: '2099-01-01T00:00:00.000Z',
        claimedAt: null,
        revokedAt: null
      }
    });
    finalizeExternalEndorsementClaim.mockResolvedValue({
      success: true,
      outcome: 'claimed'
    });
  });

  it('loads preview data for active claims', async () => {
    const { load } = await import('./+page.server');

    await expect(
      load({
        locals: { getSession: vi.fn().mockResolvedValue(null) },
        params: { token: 'claim-token-1' },
        cookies: createCookies(),
        url: new URL('http://localhost/claim/claim-token-1')
      } as any)
    ).resolves.toMatchObject({
      token: 'claim-token-1',
      preview: {
        authorName: '추천인',
        state: 'active'
      },
      statusMessage: null
    });
  });

  it('redirects guests to auth login after warning confirmation', async () => {
    const { actions } = await import('./+page.server');
    const cookies = createCookies();

    await expectRedirect(
      () =>
        actions.claim({
          locals: { getSession: vi.fn().mockResolvedValue(null) },
          params: { token: 'claim-token-1' },
          cookies,
          request: createFormRequest({ warningAccepted: 'true' })
        } as any),
      303,
      '/auth/login?next=%2Fclaim%2Fclaim-token-1%3Fclaim%3Dcontinue'
    );

    expect(cookies.set).toHaveBeenCalledWith(
      'pending_claim_token',
      'claim-token-1',
      expect.objectContaining({ path: '/', httpOnly: true })
    );
  });

  it('requires the warning acknowledgement before continuing', async () => {
    const { actions } = await import('./+page.server');

    await expect(
      actions.claim({
        locals: { getSession: vi.fn().mockResolvedValue(null) },
        params: { token: 'claim-token-1' },
        cookies: createCookies(),
        request: createFormRequest({})
      } as any)
    ).resolves.toMatchObject({
      status: 400,
      data: {
        claimError: '경고 내용을 확인한 후에만 추천서를 받을 수 있습니다.'
      }
    });
  });

  it('auto-finalizes after returning from auth when the claim cookie matches', async () => {
    const { load } = await import('./+page.server');
    const cookies = createCookies({ pending_claim_token: 'claim-token-1' });

    await expectRedirect(
      () =>
        load({
          locals: {
            getSession: vi.fn().mockResolvedValue({ user: { id: 'claimant-1' } })
          },
          params: { token: 'claim-token-1' },
          cookies,
          url: new URL('http://localhost/claim/claim-token-1?claim=continue')
        } as any),
      303,
      '/mypage/profile?claimStatus=claimed'
    );

    expect(finalizeExternalEndorsementClaim).toHaveBeenCalledWith({
      token: 'claim-token-1',
      claimantUserId: 'claimant-1'
    });
    expect(cookies.delete).toHaveBeenCalledWith('pending_claim_token', { path: '/' });
  });

  it('redirects auto-resume requests back with a claimed status when the link is already consumed', async () => {
    getExternalEndorsementClaimPreview.mockResolvedValue({
      success: true,
      preview: {
        id: 'claim-1',
        authorId: 'author-1',
        authorName: '추천인',
        token: 'claim-token-1',
        state: 'claimed',
        expiresAt: '2099-01-01T00:00:00.000Z',
        claimedAt: '2026-03-16T00:00:00.000Z',
        revokedAt: null
      }
    });

    const { load } = await import('./+page.server');
    const cookies = createCookies({ pending_claim_token: 'claim-token-1' });

    await expectRedirect(
      () =>
        load({
          locals: {
            getSession: vi.fn().mockResolvedValue({ user: { id: 'claimant-1' } })
          },
          params: { token: 'claim-token-1' },
          cookies,
          url: new URL('http://localhost/claim/claim-token-1?claim=continue')
        } as any),
      303,
      '/claim/claim-token-1?status=claimed'
    );

    expect(cookies.delete).toHaveBeenCalledWith('pending_claim_token', { path: '/' });
  });

  it('redirects auto-resume requests back with an invalid status when the claim is missing', async () => {
    getExternalEndorsementClaimPreview.mockResolvedValue({
      success: false,
      reason: 'not-found'
    });

    const { load } = await import('./+page.server');
    const cookies = createCookies({ pending_claim_token: 'claim-token-1' });

    await expectRedirect(
      () =>
        load({
          locals: {
            getSession: vi.fn().mockResolvedValue({ user: { id: 'claimant-1' } })
          },
          params: { token: 'claim-token-1' },
          cookies,
          url: new URL('http://localhost/claim/claim-token-1?claim=continue')
        } as any),
      303,
      '/claim/claim-token-1?status=invalid'
    );

    expect(cookies.delete).toHaveBeenCalledWith('pending_claim_token', { path: '/' });
  });

  it('maps finalize failures back into a readable status', async () => {
    finalizeExternalEndorsementClaim.mockResolvedValue({
      success: false,
      reason: 'self-claim-not-allowed'
    });

    const { actions } = await import('./+page.server');

    await expect(
      actions.claim({
        locals: { getSession: vi.fn().mockResolvedValue({ user: { id: 'author-1' } }) },
        params: { token: 'claim-token-1' },
        cookies: createCookies(),
        request: createFormRequest({ warningAccepted: 'true' })
      } as any)
    ).resolves.toMatchObject({
      status: 400,
      data: {
        claimError: '내가 만든 추천 링크는 내 계정으로 받을 수 없습니다.'
      }
    });
  });
});
