import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryBuilder, createSupabaseFromQueue } from '../../test/support/supabase';

describe('external endorsement helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('builds claim paths, hashes tokens, and resolves expired states', async () => {
    const {
      buildExternalEndorsementClaimPath,
      hashExternalEndorsementClaimToken,
      resolveExternalEndorsementClaimState
    } = await import('./externalEndorsement');

    expect(buildExternalEndorsementClaimPath('token-123')).toBe('/claim/token-123');
    expect(hashExternalEndorsementClaimToken('token-123')).toHaveLength(32);
    expect(
      resolveExternalEndorsementClaimState(
        {
          status: 'active',
          expires_at: '2026-01-01T00:00:00.000Z'
        },
        new Date('2026-01-02T00:00:00.000Z')
      )
    ).toBe('expired');
  });

  it('creates external claims via RPC', async () => {
    const { createExternalEndorsementClaim } = await import('./externalEndorsement');
    const adminSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          id: 'claim-1',
          token: 'claim-token-1',
          status: 'active',
          expires_at: '2026-04-15T00:00:00.000Z',
          created_at: '2026-03-16T00:00:00.000Z'
        },
        error: null
      })
    };

    await expect(
      createExternalEndorsementClaim({
        authorId: 'author-1',
        authorName: '추천인',
        content: '충분히 긴 외부 추천 내용입니다. 링크로 전달해 주세요.',
        quota: 2,
        adminClient: adminSupabase as any
      })
    ).resolves.toMatchObject({
      success: true,
      claim: {
        id: 'claim-1',
        token: 'claim-token-1',
        status: 'active'
      }
    });

    expect(adminSupabase.rpc).toHaveBeenCalledWith('create_external_endorsement_claim', {
      p_author: 'author-1',
      p_author_name: '추천인',
      p_content: '충분히 긴 외부 추천 내용입니다. 링크로 전달해 주세요.',
      p_quota: 2
    });
  });

  it('maps invite quota exhaustion from the create RPC', async () => {
    const { createExternalEndorsementClaim } = await import('./externalEndorsement');
    const adminSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'invite_quota_exhausted' }
      })
    };

    await expect(
      createExternalEndorsementClaim({
        authorId: 'author-1',
        authorName: '추천인',
        content: '충분히 긴 외부 추천 내용입니다. 링크로 전달해 주세요.',
        quota: 2,
        adminClient: adminSupabase as any
      })
    ).resolves.toMatchObject({
      success: false,
      reason: 'invite-quota-exhausted'
    });
  });

  it('returns preview-safe data for active claims', async () => {
    const { getExternalEndorsementClaimPreview, hashExternalEndorsementClaimToken } = await import(
      './externalEndorsement'
    );
    const adminSupabase = createSupabaseFromQueue([
      {
        table: 'external_endorsement_claims',
        builder: createQueryBuilder({
          maybeSingle: {
            data: {
              id: 'claim-1',
              author_id: 'author-1',
              author_name_snapshot: '추천인',
              status: 'active',
              expires_at: '2099-04-15T00:00:00.000Z',
              claimed_at: null,
              revoked_at: null
            },
            error: null
          }
        })
      }
    ]);

    await expect(
      getExternalEndorsementClaimPreview({
        token: 'claim-token-1',
        adminClient: adminSupabase as any
      })
    ).resolves.toEqual({
      success: true,
      preview: {
        id: 'claim-1',
        authorId: 'author-1',
        authorName: '추천인',
        state: 'active',
        expiresAt: '2099-04-15T00:00:00.000Z',
        claimedAt: null,
        revokedAt: null
      }
    });

    const claimLookupBuilder = (adminSupabase as any).from.mock.results[0].value;
    expect(claimLookupBuilder.eq).toHaveBeenCalledWith(
      'claim_token_hash',
      hashExternalEndorsementClaimToken('claim-token-1')
    );
  });

  it('revokes active claims and deletes hidden invites', async () => {
    const { revokeExternalEndorsementClaim } = await import('./externalEndorsement');
    const claimUpdateBuilder = createQueryBuilder({
      awaited: { error: null }
    });
    const inviteCleanupBuilder = createQueryBuilder({
      awaited: { error: null }
    });
    const adminSupabase = createSupabaseFromQueue([
      {
        table: 'external_endorsement_claims',
        builder: createQueryBuilder({
          maybeSingle: {
            data: {
              id: 'claim-1',
              author_id: 'author-1',
              hidden_invite_id: 'hidden-invite-1',
              status: 'active',
              expires_at: '2099-01-01T00:00:00.000Z'
            },
            error: null
          }
        })
      },
      {
        table: 'external_endorsement_claims',
        builder: claimUpdateBuilder
      },
      {
        table: 'invites',
        builder: inviteCleanupBuilder
      }
    ]);

    await expect(
      revokeExternalEndorsementClaim({
        claimId: 'claim-1',
        authorId: 'author-1',
        adminClient: adminSupabase as any
      })
    ).resolves.toEqual({
      success: true
    });

    expect(claimUpdateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'revoked',
        revoked_at: expect.any(String)
      })
    );
    expect(inviteCleanupBuilder.delete).toHaveBeenCalled();
  });

  it('finalizes claims via RPC for first-time recipients', async () => {
    const { finalizeExternalEndorsementClaim } = await import('./externalEndorsement');
    const adminSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          outcome: 'claimed',
          claim_id: 'claim-1',
          endorsement_id: 'endorsement-1'
        },
        error: null
      })
    };

    await expect(
      finalizeExternalEndorsementClaim({
        token: 'claim-token-1',
        claimantUserId: 'claimant-1',
        adminClient: adminSupabase as any
      })
    ).resolves.toEqual({
      success: true,
      outcome: 'claimed',
      claimId: 'claim-1',
      endorsementId: 'endorsement-1'
    });

    expect(adminSupabase.rpc).toHaveBeenCalledWith('claim_external_endorsement', {
      p_token: 'claim-token-1',
      p_claimant: 'claimant-1'
    });
  });

  it('returns already-linked when the finalize RPC reuses an existing endorsement', async () => {
    const { finalizeExternalEndorsementClaim } = await import('./externalEndorsement');
    const adminSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          outcome: 'already-linked',
          claim_id: 'claim-1',
          endorsement_id: 'existing-endorsement-1'
        },
        error: null
      })
    };

    await expect(
      finalizeExternalEndorsementClaim({
        token: 'claim-token-1',
        claimantUserId: 'claimant-1',
        adminClient: adminSupabase as any
      })
    ).resolves.toEqual({
      success: true,
      outcome: 'already-linked',
      claimId: 'claim-1',
      endorsementId: 'existing-endorsement-1'
    });
  });

  it('maps finalize RPC terminal errors back to claim reasons', async () => {
    const { finalizeExternalEndorsementClaim } = await import('./externalEndorsement');
    const adminSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'claim_self_not_allowed' }
      })
    };

    await expect(
      finalizeExternalEndorsementClaim({
        token: 'claim-token-1',
        claimantUserId: 'author-1',
        adminClient: adminSupabase as any
      })
    ).resolves.toEqual({
      success: false,
      reason: 'self-claim-not-allowed'
    });
  });
});
