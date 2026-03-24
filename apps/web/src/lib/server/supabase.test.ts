import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createServerClient, getSupabaseConfig } = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getSupabaseConfig: vi.fn()
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient
}));

vi.mock('$lib/supabase/config', () => ({
  getSupabaseConfig
}));

describe('createSupabaseServerClient', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getSupabaseConfig.mockReturnValue({
      supabaseUrl: 'https://supabase.test',
      supabaseAnonKey: 'anon-key'
    });
  });

  it('creates a server client wired to SvelteKit cookie helpers', async () => {
    createServerClient.mockReturnValue({ client: true });

    const { createSupabaseServerClient } = await import('./supabase');
    const event = {
      cookies: {
        get: vi.fn(() => 'cookie-value'),
        set: vi.fn(),
        delete: vi.fn()
      }
    } as any;

    const client = createSupabaseServerClient(event);
    const options = createServerClient.mock.calls[0][2];

    expect(client).toEqual({ client: true });
    expect(createServerClient).toHaveBeenCalledWith(
      'https://supabase.test',
      'anon-key',
      expect.any(Object)
    );

    expect(options.cookies.get('sb')).toBe('cookie-value');
    options.cookies.set('sb', 'next', { secure: true });
    options.cookies.remove('sb', { secure: true });

    expect(event.cookies.set).toHaveBeenCalledWith('sb', 'next', { secure: true, path: '/' });
    expect(event.cookies.delete).toHaveBeenCalledWith('sb', { secure: true, path: '/' });
  });
});
