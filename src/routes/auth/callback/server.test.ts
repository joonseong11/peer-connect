import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryBuilder, createSupabaseFromQueue } from '../../../test/support/supabase';
import { expectRedirect } from '../../../test/support/sveltekit';

const { redeemInviteCode } = vi.hoisted(() => ({
  redeemInviteCode: vi.fn()
}));

vi.mock('$lib/server/invite', () => ({
  redeemInviteCode
}));

const session = {
  user: {
    id: 'user-1',
    email: 'member@example.com',
    user_metadata: {}
  }
} as any;

const createCookies = (initialPendingInviteCode?: string | null) => {
  const store = new Map<string, string>();

  if (initialPendingInviteCode) {
    store.set('pending_invite_code', initialPendingInviteCode);
  }

  return {
    get: vi.fn((name: string) => store.get(name)),
    delete: vi.fn((name: string) => {
      store.delete(name);
    })
  };
};

describe('/auth/callback GET', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('redirects to the auth error page when code exchange fails', async () => {
    const { GET } = await import('./+server');
    const cookies = createCookies();

    await expectRedirect(
      () =>
        GET({
          url: new URL('http://localhost/auth/callback?code=oauth-code'),
          locals: {
            supabase: {
              auth: {
                exchangeCodeForSession: vi.fn().mockResolvedValue({
                  error: { message: 'exchange failed' }
                })
              }
            },
            getSession: vi.fn()
          } as any,
          cookies
        } as any),
      303,
      '/?authError=google'
    );
  });

  it('redeems pending invites and redirects immediately on success', async () => {
    redeemInviteCode.mockResolvedValue({
      success: true,
      redirectTo: '/profile?onboarding=seed'
    });

    const { GET } = await import('./+server');
    const cookies = createCookies('INVITE42');

    await expectRedirect(
      () =>
        GET({
          url: new URL('http://localhost/auth/callback?code=oauth-code'),
          locals: {
            supabase: {
              auth: {
                exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null })
              }
            },
            getSession: vi.fn().mockResolvedValue(session)
          } as any,
          cookies
        } as any),
      303,
      '/profile?onboarding=seed'
    );

    expect(redeemInviteCode).toHaveBeenCalledWith({
      supabase: expect.any(Object),
      session,
      code: 'INVITE42'
    });
    expect(cookies.delete).toHaveBeenCalledWith('pending_invite_code', { path: '/' });
  });

  it('keeps the pending invite cookie on generic redemption errors and redirects incomplete users to profile onboarding', async () => {
    redeemInviteCode.mockResolvedValue({
      success: false,
      status: 500,
      reason: 'generic',
      message: 'temporary error'
    });

    const { GET } = await import('./+server');
    const cookies = createCookies('INVITE42');
    const supabase = createSupabaseFromQueue([
      {
        table: 'profiles',
        builder: createQueryBuilder({
          maybeSingle: { data: null, error: null }
        })
      }
    ]);

    (supabase as any).auth = {
      exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null })
    };

    await expectRedirect(
      () =>
        GET({
          url: new URL('http://localhost/auth/callback?code=oauth-code'),
          locals: {
            supabase,
            getSession: vi.fn().mockResolvedValue(session)
          } as any,
          cookies
        } as any),
      303,
      '/profile?onboarding=1'
    );

    expect(cookies.delete).not.toHaveBeenCalled();
  });

  it('clears the pending invite cookie for definitive errors and falls back to a safe redirect target', async () => {
    redeemInviteCode.mockResolvedValue({
      success: false,
      status: 400,
      reason: 'invalid',
      message: 'invalid invite'
    });

    const { GET } = await import('./+server');
    const cookies = createCookies('INVITE42');
    const supabase = createSupabaseFromQueue([
      {
        table: 'profiles',
        builder: createQueryBuilder({
          maybeSingle: {
            data: { profile_completed_at: '2026-03-15T10:00:00.000Z' },
            error: null
          }
        })
      }
    ]);

    (supabase as any).auth = {
      exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null })
    };

    await expectRedirect(
      () =>
        GET({
          url: new URL('http://localhost/auth/callback?code=oauth-code&next=https://evil.test'),
          locals: {
            supabase,
            getSession: vi.fn().mockResolvedValue(session)
          } as any,
          cookies
        } as any),
      303,
      '/'
    );

    expect(cookies.delete).toHaveBeenCalledWith('pending_invite_code', { path: '/' });
  });
});
