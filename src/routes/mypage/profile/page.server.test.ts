import { describe, expect, it, vi } from 'vitest';
import { createQueryBuilder, createSupabaseFromQueue } from '../../../test/support/supabase';
import { expectRedirect } from '../../../test/support/sveltekit';

describe('/mypage/profile load', () => {
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

  it('reports profile load errors', async () => {
    const { load } = await import('./+page.server');
    const session = { user: { id: 'user-1' } } as any;
    const supabase = createSupabaseFromQueue([
      {
        table: 'profiles',
        builder: createQueryBuilder({
          maybeSingle: { data: null, error: { message: 'boom' } }
        })
      },
      {
        table: 'endorsements',
        builder: createQueryBuilder({
          awaited: { data: [], error: null }
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
      endorsements: [],
      loadError: '프로필 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
    });
  });
});
