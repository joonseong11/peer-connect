import { describe, expect, it, vi } from 'vitest';
import { expectRedirect } from '../../../test/support/sveltekit';

describe('/auth/signout', () => {
  it('returns 500 when sign out fails', async () => {
    const { POST } = await import('./+server');
    const response = await POST({
      locals: {
        supabase: {
          auth: {
            signOut: vi.fn().mockResolvedValue({ error: { message: 'boom' } })
          }
        }
      }
    } as any);

    expect(response.status).toBe(500);
    await expect(response.text()).resolves.toBe('로그아웃에 실패했습니다.');
  });

  it('redirects to home after a successful sign out', async () => {
    const { POST } = await import('./+server');

    await expectRedirect(
      () =>
        POST({
          locals: {
            supabase: {
              auth: {
                signOut: vi.fn().mockResolvedValue({ error: null })
              }
            }
          }
        } as any),
      303,
      '/'
    );
  });
});
