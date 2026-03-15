import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryBuilder, createSupabaseByTable } from '../test/support/supabase';
import { expectRedirect } from '../test/support/sveltekit';

const configState = {
  invitesEnabled: true
};

const { hasProfileEmailColumn } = vi.hoisted(() => ({
  hasProfileEmailColumn: vi.fn()
}));

vi.mock('$lib/config', () => ({
  get INVITES_ENABLED() {
    return configState.invitesEnabled;
  }
}));

vi.mock('$lib/server/profileEmailColumn', () => ({
  hasProfileEmailColumn
}));

describe('root layout load', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    configState.invitesEnabled = true;
  });

  it('returns a guest layout payload when there is no session', async () => {
    const { load } = await import('./+layout.server');

    await expect(
      load({
        locals: { getSession: vi.fn().mockResolvedValue(null) },
        url: new URL('http://localhost/')
      } as any)
    ).resolves.toEqual({
      session: null,
      invite: null
    });
  });

  it('creates a default profile and redirects to invite when invite linkage is required', async () => {
    hasProfileEmailColumn.mockResolvedValue(true);
    const session = {
      user: {
        id: 'user-1',
        email: 'User@Example.com',
        user_metadata: {
          full_name: '김개발',
          title: 'Backend Engineer'
        }
      }
    } as any;
    const insertBuilder = createQueryBuilder({
      awaited: { error: null }
    });
    const supabase = createSupabaseByTable({
      profiles: [
        createQueryBuilder({
          maybeSingle: { data: null, error: null }
        }),
        insertBuilder
      ],
      invite_redemptions: [
        createQueryBuilder({
          maybeSingle: { data: null, error: null }
        })
      ]
    });

    const { load } = await import('./+layout.server');

    await expectRedirect(
      () =>
        load({
          locals: { getSession: vi.fn().mockResolvedValue(session), supabase },
          url: new URL('http://localhost/gatherings')
        } as any),
      303,
      '/invite'
    );

    expect(insertBuilder.insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      full_name: '김개발',
      role: 'Backend Engineer',
      email: 'user@example.com'
    });
  });

  it('syncs the OAuth email into the profile and returns invite metadata', async () => {
    hasProfileEmailColumn.mockResolvedValue(true);
    const session = {
      user: {
        id: 'user-1',
        email: 'next@example.com',
        user_metadata: {}
      }
    } as any;
    const updateBuilder = createQueryBuilder({
      awaited: { error: null }
    });
    const supabase = createSupabaseByTable({
      profiles: [
        createQueryBuilder({
          maybeSingle: {
            data: {
              user_id: 'user-1',
              profile_completed_at: '2026-03-15T10:00:00.000Z',
              email: 'previous@example.com',
              contact_email: null
            },
            error: null
          }
        }),
        updateBuilder
      ],
      invite_redemptions: [
        createQueryBuilder({
          maybeSingle: {
            data: {
              id: 'redemption-1',
              invite_id: 'invite-1',
              invite: { inviter_user_id: 'inviter-1' }
            },
            error: null
          }
        })
      ]
    });

    const { load } = await import('./+layout.server');

    await expect(
      load({
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase },
        url: new URL('http://localhost/members')
      } as any)
    ).resolves.toEqual({
      session,
      invite: {
        redemption_id: 'redemption-1',
        invite_id: 'invite-1',
        inviter_user_id: 'inviter-1'
      },
      invitesEnabled: true
    });

    expect(updateBuilder.update).toHaveBeenCalledWith({
      email: 'next@example.com',
      contact_email: 'previous@example.com'
    });
  });
});
