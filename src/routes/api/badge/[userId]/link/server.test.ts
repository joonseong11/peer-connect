import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryBuilder, createSupabaseFromQueue } from '../../../../../test/support/supabase';
import { createCookies, expectHttpError, expectRedirect } from '../../../../../test/support/sveltekit';

const { getSupabaseAdminClient } = vi.hoisted(() => ({
  getSupabaseAdminClient: vi.fn()
}));

vi.mock('$lib/server/supabaseAdmin', () => ({
  getSupabaseAdminClient
}));

describe('/api/badge/[userId]/link', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('11111111-1111-1111-1111-111111111111');
  });

  it('throws 500 when the admin client is unavailable', async () => {
    getSupabaseAdminClient.mockReturnValue(null);
    const { GET } = await import('./+server');

    await expectHttpError(
      () =>
        GET({
          params: { userId: 'user-1' },
          url: new URL('http://localhost/api/badge/user-1/link'),
          cookies: createCookies()
        } as any),
      500,
      'Server configuration error'
    );
  });

  it('reuses an existing badge invite and redirects with a cookie', async () => {
    const adminClient = createSupabaseFromQueue([
      {
        table: 'invites',
        builder: createQueryBuilder({
          maybeSingle: { data: { code: 'EXISTING42' }, error: null }
        })
      }
    ]);
    getSupabaseAdminClient.mockReturnValue(adminClient);
    const cookies = createCookies();
    const { GET } = await import('./+server');

    await expectRedirect(
      () =>
        GET({
          params: { userId: 'user-1' },
          url: new URL('http://localhost/api/badge/user-1/link'),
          cookies
        } as any),
      303,
      '/members/user-1?inviteCode=EXISTING42'
    );

    expect(cookies.set).toHaveBeenCalledWith(
      'pending_invite_code',
      'EXISTING42',
      expect.objectContaining({ path: '/', httpOnly: true })
    );
  });

  it('throws 404 for unknown users and 500 on invite generation failures', async () => {
    const profileMissingClient = createSupabaseFromQueue([
      {
        table: 'invites',
        builder: createQueryBuilder({
          maybeSingle: { data: null, error: null }
        })
      },
      {
        table: 'profiles',
        builder: createQueryBuilder({
          maybeSingle: { data: null, error: null }
        })
      }
    ]);
    getSupabaseAdminClient.mockReturnValue(profileMissingClient);
    const { GET } = await import('./+server');

    await expectHttpError(
      () =>
        GET({
          params: { userId: 'user-1' },
          url: new URL('http://localhost/api/badge/user-1/link'),
          cookies: createCookies()
        } as any),
      404,
      'User not found'
    );

    const insertFailClient = createSupabaseFromQueue([
      {
        table: 'invites',
        builder: createQueryBuilder({
          maybeSingle: { data: null, error: null }
        })
      },
      {
        table: 'profiles',
        builder: createQueryBuilder({
          maybeSingle: { data: { user_id: 'user-1' }, error: null }
        })
      },
      {
        table: 'invites',
        builder: createQueryBuilder({
          awaited: { error: { message: 'insert failed' } }
        })
      }
    ]);
    getSupabaseAdminClient.mockReturnValue(insertFailClient);

    await expectHttpError(
      () =>
        GET({
          params: { userId: 'user-1' },
          url: new URL('http://localhost/api/badge/user-1/link'),
          cookies: createCookies()
        } as any),
      500,
      'Failed to generate invite link'
    );
  });
});
