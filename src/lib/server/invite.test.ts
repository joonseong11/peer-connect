import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryBuilder, createSupabaseFromQueue } from '../../test/support/supabase';

vi.mock('$lib/config', () => ({
  INVITE_FALLBACK_CODE: 'FALLBACK42'
}));

const session = {
  user: {
    id: 'invitee-1',
    email: 'invitee@example.com',
    user_metadata: {}
  }
} as any;

describe('invite helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('normalizes codes and maps redeem reasons', async () => {
    const { mapRedeemReasonToStatus, normalizeCode } = await import('./invite');

    expect(normalizeCode(' ab12cd ')).toBe('AB12CD');
    expect(mapRedeemReasonToStatus('already-used')).toBe('redeem-used');
    expect(mapRedeemReasonToStatus('already-linked')).toBe('redeem-linked');
    expect(mapRedeemReasonToStatus('invalid')).toBe('invalid');
    expect(mapRedeemReasonToStatus('generic')).toBe('redeem-error');
  });

  it('returns invalid when the submitted code is empty', async () => {
    const { redeemInviteCode } = await import('./invite');
    const supabase = { from: vi.fn() };

    await expect(
      redeemInviteCode({
        supabase: supabase as any,
        session,
        code: '   '
      })
    ).resolves.toMatchObject({
      success: false,
      reason: 'invalid',
      status: 400
    });

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('returns already-linked when the user already redeemed an invite', async () => {
    const { redeemInviteCode } = await import('./invite');
    const supabase = createSupabaseFromQueue([
      {
        table: 'invite_redemptions',
        builder: createQueryBuilder({
          maybeSingle: { data: { id: 'redemption-1' }, error: null }
        })
      }
    ]);

    await expect(
      redeemInviteCode({
        supabase: supabase as any,
        session,
        code: 'ABCD1234'
      })
    ).resolves.toMatchObject({
      success: false,
      reason: 'already-linked',
      status: 400
    });
  });

  it('rejects invites that are already exhausted', async () => {
    const { redeemInviteCode } = await import('./invite');
    const supabase = createSupabaseFromQueue([
      {
        table: 'invite_redemptions',
        builder: createQueryBuilder({
          maybeSingle: { data: null, error: null }
        })
      },
      {
        table: 'invites',
        builder: createQueryBuilder({
          maybeSingle: {
            data: {
              id: 'invite-1',
              inviter_user_id: 'inviter-1',
              max_redemptions: 1,
              beta_unlimited: false,
              deactivated_at: null,
              invite_redemptions: [{ id: 'already-used' }]
            },
            error: null
          }
        })
      }
    ]);

    await expect(
      redeemInviteCode({
        supabase: supabase as any,
        session,
        code: 'ABCD1234'
      })
    ).resolves.toMatchObject({
      success: false,
      reason: 'already-used',
      status: 400
    });
  });

  it('redeems valid invites and deactivates them on the final allowed use', async () => {
    const { redeemInviteCode } = await import('./invite');
    const insertBuilder = createQueryBuilder({
      awaited: { error: null }
    });
    const deactivateBuilder = createQueryBuilder({
      awaited: { error: null }
    });
    const supabase = createSupabaseFromQueue([
      {
        table: 'invite_redemptions',
        builder: createQueryBuilder({
          maybeSingle: { data: null, error: null }
        })
      },
      {
        table: 'invites',
        builder: createQueryBuilder({
          maybeSingle: {
            data: {
              id: 'invite-1',
              inviter_user_id: 'inviter-1',
              max_redemptions: 2,
              beta_unlimited: false,
              deactivated_at: null,
              invite_redemptions: [{ id: 'redemption-1' }]
            },
            error: null
          }
        })
      },
      {
        table: 'invite_redemptions',
        builder: insertBuilder
      },
      {
        table: 'invites',
        builder: deactivateBuilder
      }
    ]);

    await expect(
      redeemInviteCode({
        supabase: supabase as any,
        session,
        code: 'ABCD1234'
      })
    ).resolves.toEqual({
      success: true,
      redirectTo: '/members/inviter-1?endorsementStatus=prompt'
    });

    expect(insertBuilder.insert).toHaveBeenCalledWith({
      invite_id: 'invite-1',
      invitee_user_id: 'invitee-1'
    });
    expect(deactivateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        deactivated_at: expect.any(String)
      })
    );
  });

  it('creates and redeems the fallback invite code', async () => {
    const { redeemInviteCode } = await import('./invite');
    const fallbackInsertBuilder = createQueryBuilder({
      single: {
        data: { id: 'fallback-invite-1' },
        error: null
      }
    });
    const redeemBuilder = createQueryBuilder({
      awaited: { error: null }
    });
    const deactivateBuilder = createQueryBuilder({
      awaited: { error: null }
    });
    const supabase = createSupabaseFromQueue([
      {
        table: 'invite_redemptions',
        builder: createQueryBuilder({
          maybeSingle: { data: null, error: null }
        })
      },
      {
        table: 'invite_redemptions',
        builder: createQueryBuilder({
          awaited: { count: 0, error: null }
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
        builder: fallbackInsertBuilder
      },
      {
        table: 'invite_redemptions',
        builder: createQueryBuilder({
          awaited: { count: 0, error: null }
        })
      },
      {
        table: 'invite_redemptions',
        builder: redeemBuilder
      },
      {
        table: 'invites',
        builder: deactivateBuilder
      }
    ]);

    await expect(
      redeemInviteCode({
        supabase: supabase as any,
        session,
        code: 'fallback42'
      })
    ).resolves.toEqual({
      success: true,
      redirectTo: '/profile?onboarding=seed'
    });

    expect(fallbackInsertBuilder.insert).toHaveBeenCalledWith({
      code: 'FALLBACK42',
      inviter_user_id: null,
      slot_index: 0,
      max_redemptions: 1,
      beta_unlimited: false
    });
    expect(redeemBuilder.insert).toHaveBeenCalledWith({
      invite_id: 'fallback-invite-1',
      invitee_user_id: 'invitee-1'
    });
    expect(deactivateBuilder.update).toHaveBeenCalled();
  });
});
