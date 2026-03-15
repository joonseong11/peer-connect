import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryBuilder, createSupabaseFromQueue } from '../../test/support/supabase';
import { expectRedirect } from '../../test/support/sveltekit';

const { INVITES_ENABLED } = vi.hoisted(() => ({
  INVITES_ENABLED: true
}));

vi.mock('$lib/config', () => ({
  INVITES_ENABLED
}));

describe('/mypage load', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('redirects unauthenticated users', async () => {
    const { load } = await import('./+page.server');

    await expectRedirect(
      () =>
        load({
          locals: { getSession: vi.fn().mockResolvedValue(null) }
        } as any),
      303,
      '/?authError=signin-required'
    );
  });

  it('returns a profile summary with a friendly load error when needed', async () => {
    const { load } = await import('./+page.server');
    const session = { user: { id: 'user-1' } } as any;
    const supabase = createSupabaseFromQueue([
      {
        table: 'profiles',
        builder: createQueryBuilder({
          maybeSingle: { data: null, error: { message: 'boom' } }
        })
      }
    ]);

    await expect(
      load({
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase }
      } as any)
    ).resolves.toEqual({
      session,
      profile: null,
      invitesEnabled: true,
      profileLoadError: '프로필 요약을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
    });
  });
});
