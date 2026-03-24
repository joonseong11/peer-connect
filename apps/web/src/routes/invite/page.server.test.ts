import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryBuilder, createSupabaseFromQueue } from '../../test/support/supabase';
import { createCookies, createFormRequest, expectRedirect } from '../../test/support/sveltekit';

const configState = {
  invitesEnabled: true,
  slotCount: 2,
  unlimitedSlotIndex: 2,
  unlimitedUserIds: [] as string[],
  fallbackCode: null as string | null
};

const { redeemInviteCode, mapRedeemReasonToStatus, normalizeCode } = vi.hoisted(() => ({
  redeemInviteCode: vi.fn(),
  mapRedeemReasonToStatus: vi.fn((reason: string) => `mapped-${reason}`),
  normalizeCode: vi.fn((code: string) => code.trim().toUpperCase())
}));

const { createExternalEndorsementClaim, revokeExternalEndorsementClaim } = vi.hoisted(() => ({
  createExternalEndorsementClaim: vi.fn(),
  revokeExternalEndorsementClaim: vi.fn()
}));

vi.mock('$lib/config', () => ({
  get INVITES_ENABLED() {
    return configState.invitesEnabled;
  },
  get INVITE_CARD_SLOT_COUNT() {
    return configState.slotCount;
  },
  get INVITE_UNLIMITED_SLOT_INDEX() {
    return configState.unlimitedSlotIndex;
  },
  get INVITE_UNLIMITED_USER_IDS() {
    return configState.unlimitedUserIds;
  },
  get INVITE_FALLBACK_CODE() {
    return configState.fallbackCode;
  }
}));

vi.mock('$lib/server/invite', () => ({
  redeemInviteCode,
  mapRedeemReasonToStatus,
  normalizeCode
}));

vi.mock('$lib/server/externalEndorsement', () => ({
  createExternalEndorsementClaim,
  revokeExternalEndorsementClaim,
  resolveExternalEndorsementClaimState: ({
    status,
    expires_at
  }: {
    status: 'active' | 'claimed' | 'revoked';
    expires_at: string;
  }) => {
    if (status === 'claimed') {
      return 'claimed';
    }

    if (status === 'revoked') {
      return 'revoked';
    }

    return new Date(expires_at).getTime() < Date.now() ? 'expired' : 'active';
  }
}));

describe('/invite', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    configState.invitesEnabled = true;
    configState.slotCount = 2;
    configState.unlimitedSlotIndex = 2;
    configState.unlimitedUserIds = [];
    configState.fallbackCode = null;
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('22222222-2222-2222-2222-222222222222');
    redeemInviteCode.mockResolvedValue({
      success: false,
      status: 400,
      reason: 'invalid',
      message: '잘못된 초대 코드입니다.'
    });
    createExternalEndorsementClaim.mockResolvedValue({
      success: true,
      claim: {
        id: 'claim-1',
        token: 'claim-token-1'
      }
    });
    revokeExternalEndorsementClaim.mockResolvedValue({
      success: true
    });
  });

  it('redirects guests with a pending code back to home with authRedirect', async () => {
    const { load } = await import('./+page.server');
    const cookies = createCookies();

    await expectRedirect(
      () =>
        load({
          locals: { getSession: vi.fn().mockResolvedValue(null) },
          url: new URL('http://localhost/invite?code=ABC123'),
          cookies
        } as any),
      303,
      '/?authRedirect=%2Finvite%3Fcode%3DABC123'
    );

    expect(cookies.set).toHaveBeenCalledWith(
      'pending_invite_code',
      'ABC123',
      expect.objectContaining({ path: '/', httpOnly: true })
    );
  });

  it('returns disabled state when invites are turned off', async () => {
    configState.invitesEnabled = false;
    const session = { user: { id: 'user-1' } } as any;
    const { load } = await import('./+page.server');

    await expect(
      load({
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase: {} },
        url: new URL('http://localhost/invite'),
        cookies: createCookies()
      } as any)
    ).resolves.toEqual({
      session,
      redeemedInvite: null,
      cards: [],
      externalClaims: [],
      activeCount: 0,
      maxInvites: 2,
      statusMessage: '초대 기능은 현재 비활성화되어 있습니다.',
      invitesEnabled: false,
      hasLinkedInvite: false
    });
  });

  it('redeems pending codes during load and redirects on success', async () => {
    redeemInviteCode.mockResolvedValue({
      success: true,
      redirectTo: '/members/inviter-1?endorsementStatus=prompt'
    });
    const session = { user: { id: 'user-1' } } as any;
    const { load } = await import('./+page.server');
    const cookies = createCookies({ pending_invite_code: 'ABC123' });
    const supabase = createSupabaseFromQueue([
      {
        table: 'invite_redemptions',
        builder: createQueryBuilder({
          maybeSingle: { data: null, error: null }
        })
      }
    ]);

    await expectRedirect(
      () =>
        load({
          locals: { getSession: vi.fn().mockResolvedValue(session), supabase },
          url: new URL('http://localhost/invite'),
          cookies
        } as any),
      303,
      '/members/inviter-1?endorsementStatus=prompt'
    );

    expect(cookies.delete).toHaveBeenCalledWith('pending_invite_code', { path: '/' });
  });

  it('maps redeem failures back into status query params', async () => {
    redeemInviteCode.mockResolvedValue({
      success: false,
      status: 400,
      reason: 'already-used',
      message: '이미 사용된 초대 코드입니다.'
    });
    const session = { user: { id: 'user-1' } } as any;
    const { load } = await import('./+page.server');
    const cookies = createCookies({ pending_invite_code: 'ABC123' });
    const supabase = createSupabaseFromQueue([
      {
        table: 'invite_redemptions',
        builder: createQueryBuilder({
          maybeSingle: { data: null, error: null }
        })
      }
    ]);

    await expectRedirect(
      () =>
        load({
          locals: { getSession: vi.fn().mockResolvedValue(session), supabase },
          url: new URL('http://localhost/invite?foo=bar'),
          cookies
        } as any),
      303,
      '/invite?foo=bar&status=mapped-already-used'
    );
  });

  it('returns invite cards and status messages for linked users', async () => {
    const session = { user: { id: 'user-1' } } as any;
    const { load } = await import('./+page.server');
    const supabase = createSupabaseFromQueue([
      {
        table: 'invite_redemptions',
        builder: createQueryBuilder({
          maybeSingle: {
            data: {
              id: 'redemption-1',
              redeemed_at: '2026-03-15T10:00:00.000Z',
              invite: {
                id: 'invite-origin',
                inviter_user_id: 'inviter-1',
                inviter: { full_name: '초대한 동료', role: 'Engineer' }
              }
            },
            error: null
          }
        })
      },
      {
        table: 'invites',
        builder: createQueryBuilder({
          awaited: {
            data: [
              {
                id: 'invite-1',
                code: 'INVITE42',
                slot_index: 1,
                max_redemptions: 1,
                beta_unlimited: false,
                created_at: '2026-03-15T10:00:00.000Z',
                deactivated_at: null,
                invite_redemptions: []
              }
            ],
            error: null
          }
        })
      },
      {
        table: 'external_endorsement_claims',
        builder: createQueryBuilder({
          awaited: {
            data: [],
            error: null
          }
        })
      },
      {
        table: 'external_endorsement_claims',
        builder: createQueryBuilder({
          awaited: {
            data: [],
            error: null
          }
        })
      }
    ]);

    await expect(
      load({
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase },
        url: new URL('http://localhost/invite?status=generated&code=INVITE42'),
        cookies: createCookies()
      } as any)
    ).resolves.toMatchObject({
      session,
      redeemedInvite: {
        id: 'redemption-1',
        invite: {
          inviter_user_id: 'inviter-1'
        }
      },
      externalClaims: [],
      activeCount: 1,
      maxInvites: 2,
      statusMessage: '새 초대 코드가 생성되었습니다: INVITE42',
      invitesEnabled: true,
      hasLinkedInvite: true
    });
  });

  it('validates invite generation and redeem actions', async () => {
    const session = { user: { id: 'user-1' } } as any;
    const { actions } = await import('./+page.server');

    configState.invitesEnabled = false;
    await expect(
      actions.generate({
        locals: { getSession: vi.fn().mockResolvedValue(session) },
        request: createFormRequest({ slot: '1' })
      } as any)
    ).resolves.toMatchObject({
      status: 400,
      data: { generateError: '현재 초대 기능이 비활성화되어 있습니다.' }
    });

    configState.invitesEnabled = true;
    await expect(
      actions.generate({
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase: {} },
        request: createFormRequest({ slot: 'NaN' })
      } as any)
    ).resolves.toMatchObject({
      status: 400,
      data: { generateError: '올바르지 않은 초대권 슬롯입니다.' }
    });

    const unlinkedExternalClaimSupabase = createSupabaseFromQueue([
      {
        table: 'invite_redemptions',
        builder: createQueryBuilder({
          maybeSingle: { data: null, error: null }
        })
      }
    ]);

    await expect(
      actions.createExternalClaim({
        locals: {
          getSession: vi.fn().mockResolvedValue(session),
          supabase: unlinkedExternalClaimSupabase
        },
        request: createFormRequest({
          content: '충분히 긴 외부 추천 내용입니다. 링크로 전달해 주세요.'
        })
      } as any)
    ).resolves.toMatchObject({
      status: 400,
      data: { externalClaimError: '먼저 초대 코드를 연결해야 초대장을 사용할 수 있어요.' }
    });

    await expect(
      actions.redeem({
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase: {} },
        request: createFormRequest({ code: '   ' })
      } as any)
    ).resolves.toMatchObject({
      status: 400,
      data: { redeemError: '초대 코드를 입력해주세요.' }
    });
  });

  it('rejects unlinked or duplicate invite generation attempts', async () => {
    const session = { user: { id: 'user-1' } } as any;
    const { actions } = await import('./+page.server');
    const unlinkedSupabase = createSupabaseFromQueue([
      {
        table: 'invite_redemptions',
        builder: createQueryBuilder({
          maybeSingle: { data: null, error: null }
        })
      }
    ]);

    await expect(
      actions.generate({
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase: unlinkedSupabase },
        request: createFormRequest({ slot: '1' })
      } as any)
    ).resolves.toMatchObject({
      status: 400,
      data: { generateError: '먼저 초대 코드를 연결해야 초대장을 사용할 수 있어요.' }
    });

    const duplicateSupabase = createSupabaseFromQueue([
      {
        table: 'invite_redemptions',
        builder: createQueryBuilder({
          maybeSingle: { data: { id: 'linked-1' }, error: null }
        })
      },
      {
        table: 'invites',
        builder: createQueryBuilder({
          awaited: {
            data: [
              {
                id: 'invite-1',
                code: 'EXISTING42',
                slot_index: 1,
                max_redemptions: 1,
                beta_unlimited: false,
                created_at: null,
                deactivated_at: null,
                invite_redemptions: []
              }
            ],
            error: null
          }
        })
      }
    ]);
    (duplicateSupabase as any).rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'invite_slot_taken' }
    });

    await expect(
      actions.generate({
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase: duplicateSupabase },
        request: createFormRequest({ slot: '1' })
      } as any)
    ).resolves.toMatchObject({
      status: 400,
      data: { generateError: '이미 발급된 초대권입니다. 사용 기록을 확인해보세요.' }
    });
  });

  it('creates new invite codes and handles redeem result redirects', async () => {
    const session = { user: { id: 'user-1' } } as any;
    const { actions } = await import('./+page.server');
    const generateSupabase = createSupabaseFromQueue([
      {
        table: 'invite_redemptions',
        builder: createQueryBuilder({
          maybeSingle: { data: { id: 'linked-1' }, error: null }
        })
      },
      {
        table: 'invites',
        builder: createQueryBuilder({
          awaited: { error: null }
        })
      },
      {
        table: 'invites',
        builder: createQueryBuilder({
          awaited: {
            data: [
              {
                id: 'invite-1',
                code: 'INVITEUUID',
                slot_index: 1,
                max_redemptions: 1,
                beta_unlimited: false,
                created_at: null,
                deactivated_at: null,
                invite_redemptions: []
              }
            ],
            error: null
          }
        })
      }
    ]);
    (generateSupabase as any).rpc = vi.fn().mockResolvedValue({
      data: { id: 'invite-1', code: '2222222222' },
      error: null
    });

    await expect(
      actions.generate({
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase: generateSupabase },
        request: createFormRequest({ slot: '1' })
      } as any)
    ).resolves.toMatchObject({
      success: true,
      generatedCode: '2222222222',
      highlightSlot: 1
    });

    redeemInviteCode.mockResolvedValue({
      success: false,
      status: 400,
      reason: 'invalid',
      message: '잘못된 초대 코드입니다.'
    });
    await expect(
      actions.redeem({
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase: {} },
        request: createFormRequest({ code: 'abc123' })
      } as any)
    ).resolves.toMatchObject({
      status: 400,
      data: { redeemError: '잘못된 초대 코드입니다.' }
    });

    redeemInviteCode.mockResolvedValue({
      success: true,
      redirectTo: '/members/inviter-1?endorsementStatus=prompt'
    });
    await expectRedirect(
      () =>
        actions.redeem({
          locals: { getSession: vi.fn().mockResolvedValue(session), supabase: {} },
          request: createFormRequest({ code: 'abc123' })
        } as any),
      303,
      '/members/inviter-1?endorsementStatus=prompt'
    );
  });

  it('rejects visible invite creation when the shared invite budget is exhausted', async () => {
    const session = { user: { id: 'user-1' } } as any;
    const { actions } = await import('./+page.server');
    const supabase = createSupabaseFromQueue([
      {
        table: 'invite_redemptions',
        builder: createQueryBuilder({
          maybeSingle: { data: { id: 'linked-1' }, error: null }
        })
      }
    ]);
    (supabase as any).rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'invite_quota_exhausted' }
    });

    await expect(
      actions.generate({
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase },
        request: createFormRequest({ slot: '1' })
      } as any)
    ).resolves.toMatchObject({
      status: 400,
      data: {
        generateError:
          '사용 가능한 초대 권한이 없어 새 초대 코드를 만들 수 없습니다. 기존 초대권이나 추천 링크 사용 현황을 먼저 확인해주세요.'
      }
    });
  });

  it('creates and revokes external endorsement claims', async () => {
    const session = {
      user: { id: 'user-1', email: 'member@example.com', user_metadata: { full_name: '유저' } }
    } as any;
    const { actions } = await import('./+page.server');
    const createSupabase = createSupabaseFromQueue([
      {
        table: 'invite_redemptions',
        builder: createQueryBuilder({
          maybeSingle: { data: { id: 'linked-1' }, error: null }
        })
      },
      {
        table: 'profiles',
        builder: createQueryBuilder({
          maybeSingle: {
            data: { full_name: '유저 실명' },
            error: null
          }
        })
      },
      {
        table: 'external_endorsement_claims',
        builder: createQueryBuilder({
          awaited: {
            data: [
              {
                id: 'claim-1',
                claim_token: 'claim-token-1',
                content: '충분히 긴 외부 추천 내용입니다. 링크로 전달해 주세요.',
                author_name_snapshot: '유저 실명',
                status: 'active',
                created_at: '2026-03-16T00:00:00.000Z',
                expires_at: '2099-01-01T00:00:00.000Z',
                claimed_at: null,
                revoked_at: null,
                claimed_by: null
              }
            ],
            error: null
          }
        })
      }
    ]);

    await expect(
      actions.createExternalClaim({
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase: createSupabase },
        request: createFormRequest({
          content: '충분히 긴 외부 추천 내용입니다. 링크로 전달해 주세요.'
        })
      } as any)
    ).resolves.toMatchObject({
      success: true,
      createdExternalClaimId: 'claim-1',
      createdExternalClaimToken: 'claim-token-1',
      externalClaimStatusMessage:
        '비회원 추천 링크가 생성되었습니다. 링크를 전달받은 상대는 가입 후 바로 추천서를 받을 수 있습니다.'
    });

    expect(createExternalEndorsementClaim).toHaveBeenCalledWith({
      authorId: 'user-1',
      authorName: '유저 실명',
      content: '충분히 긴 외부 추천 내용입니다. 링크로 전달해 주세요.',
      quota: 2
    });

    const revokeSupabase = createSupabaseFromQueue([
      {
        table: 'external_endorsement_claims',
        builder: createQueryBuilder({
          awaited: {
            data: [],
            error: null
          }
        })
      }
    ]);

    await expect(
      actions.revokeExternalClaim({
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase: revokeSupabase },
        request: createFormRequest({ claimId: 'claim-1' })
      } as any)
    ).resolves.toMatchObject({
      success: true,
      externalClaimStatusMessage: '추천 링크를 철회했습니다.'
    });

    expect(revokeExternalEndorsementClaim).toHaveBeenCalledWith({
      claimId: 'claim-1',
      authorId: 'user-1'
    });
  });

  it('surfaces external claim creation failures from the service layer', async () => {
    createExternalEndorsementClaim.mockResolvedValue({
      success: false,
      reason: 'server-unavailable',
      message: '추천 링크 기능을 준비하지 못했습니다. 잠시 후 다시 시도해주세요.'
    });

    const session = {
      user: { id: 'user-1', email: 'member@example.com', user_metadata: { full_name: '유저' } }
    } as any;
    const { actions } = await import('./+page.server');
    const supabase = createSupabaseFromQueue([
      {
        table: 'invite_redemptions',
        builder: createQueryBuilder({
          maybeSingle: { data: { id: 'linked-1' }, error: null }
        })
      },
      {
        table: 'profiles',
        builder: createQueryBuilder({
          maybeSingle: {
            data: { full_name: '유저 실명' },
            error: null
          }
        })
      },
      {
        table: 'external_endorsement_claims',
        builder: createQueryBuilder({
          awaited: {
            data: [],
            error: null
          }
        })
      }
    ]);

    await expect(
      actions.createExternalClaim({
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase },
        request: createFormRequest({
          content: '충분히 긴 외부 추천 내용입니다. 링크로 전달해 주세요.'
        })
      } as any)
    ).resolves.toMatchObject({
      status: 503,
      data: {
        externalClaimError: '추천 링크 기능을 준비하지 못했습니다. 잠시 후 다시 시도해주세요.'
      }
    });
  });

  it('rejects external claim creation when invite capacity is exhausted', async () => {
    createExternalEndorsementClaim.mockResolvedValue({
      success: false,
      reason: 'invite-quota-exhausted',
      message:
        '사용 가능한 초대 권한이 없어 추천 링크를 만들 수 없습니다. 기존 초대권이나 추천 링크 사용 현황을 먼저 확인해주세요.'
    });

    const session = {
      user: { id: 'user-1', email: 'member@example.com', user_metadata: { full_name: '유저' } }
    } as any;
    const { actions } = await import('./+page.server');
    const supabase = createSupabaseFromQueue([
      {
        table: 'invite_redemptions',
        builder: createQueryBuilder({
          maybeSingle: { data: { id: 'linked-1' }, error: null }
        })
      },
      {
        table: 'profiles',
        builder: createQueryBuilder({
          maybeSingle: {
            data: { full_name: '유저 실명' },
            error: null
          }
        })
      },
      {
        table: 'external_endorsement_claims',
        builder: createQueryBuilder({
          awaited: {
            data: [],
            error: null
          }
        })
      }
    ]);

    await expect(
      actions.createExternalClaim({
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase },
        request: createFormRequest({
          content: '충분히 긴 외부 추천 내용입니다. 링크로 전달해 주세요.'
        })
      } as any)
    ).resolves.toMatchObject({
      status: 400,
      data: {
        externalClaimError:
          '사용 가능한 초대 권한이 없어 추천 링크를 만들 수 없습니다. 기존 초대권이나 추천 링크 사용 현황을 먼저 확인해주세요.'
      }
    });
  });
});
