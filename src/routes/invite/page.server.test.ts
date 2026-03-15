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
          maybeSingle: { data: { id: 'invite-1', code: 'EXISTING42' }, error: null }
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
          maybeSingle: { data: null, error: null }
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
});
