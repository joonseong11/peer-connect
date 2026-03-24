import { describe, expect, it, vi } from 'vitest';
import { expectRedirect } from '../../../test/support/sveltekit';

describe('/auth/login', () => {
  it('starts google oauth with a safe next redirect', async () => {
    const { POST } = await import('./+server');
    const locals = {
      supabase: {
        auth: {
          signInWithOAuth: vi.fn().mockResolvedValue({
            data: { url: 'https://accounts.google.com/o/oauth2' },
            error: null
          })
        }
      }
    };

    await expectRedirect(
      () =>
        POST({
          locals,
          url: new URL('http://localhost/auth/login?next=/invite?code=ABC')
        } as any),
      303,
      'https://accounts.google.com/o/oauth2'
    );

    expect(locals.supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost/auth/callback?next=%2Finvite%3Fcode%3DABC'
      }
    });
  });

  it('ignores unsafe next params and returns 500 on oauth errors', async () => {
    const { POST } = await import('./+server');
    const locals = {
      supabase: {
        auth: {
          signInWithOAuth: vi.fn().mockResolvedValue({
            data: { url: null },
            error: { message: 'boom' }
          })
        }
      }
    };

    const response = await POST({
      locals,
      url: new URL('http://localhost/auth/login?next=https://evil.test')
    } as any);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      message: '로그인을 시작하지 못했습니다.'
    });
    expect(locals.supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost/auth/callback'
      }
    });
  });

  it('supports GET by delegating to POST', async () => {
    const { GET } = await import('./+server');
    const locals = {
      supabase: {
        auth: {
          signInWithOAuth: vi.fn().mockResolvedValue({
            data: { url: 'https://accounts.google.com/o/oauth2' },
            error: null
          })
        }
      }
    };

    await expectRedirect(
      () =>
        GET({
          locals,
          url: new URL('http://localhost/auth/login')
        } as any),
      303,
      'https://accounts.google.com/o/oauth2'
    );
  });
});
