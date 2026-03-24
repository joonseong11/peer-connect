import { describe, expect, it, vi } from 'vitest';
import { createQueryBuilder, createSupabaseFromQueue } from '../../test/support/supabase';
import { expectRedirect } from '../../test/support/sveltekit';

describe('/members load', () => {
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

  it('returns a load error when invite redemption lookup fails', async () => {
    const { load } = await import('./+page.server');
    const session = { user: { id: 'user-1' } } as any;
    const supabase = createSupabaseFromQueue([
      {
        table: 'invite_redemptions',
        builder: createQueryBuilder({
          awaited: { data: null, error: { message: 'boom' } }
        })
      }
    ]);

    await expect(
      load({
        locals: { getSession: vi.fn().mockResolvedValue(session), supabase }
      } as any)
    ).resolves.toEqual({
      session,
      profiles: [],
      loadError: '초대 코드 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
    });
  });

  it('returns empty profiles when nobody has redeemed an invite', async () => {
    const { load } = await import('./+page.server');
    const session = { user: { id: 'user-1' } } as any;
    const supabase = createSupabaseFromQueue([
      {
        table: 'invite_redemptions',
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
      profiles: [],
      loadError: null
    });
  });
});
