import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createSupabaseServerClient: _createSupabaseServerClient } = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn()
}));

vi.mock('$env/dynamic/public', () => ({
  env: {
    PUBLIC_SUPABASE_URL: 'https://supabase.test',
    PUBLIC_SUPABASE_ANON_KEY: 'anon-key'
  }
}));

vi.mock('@peer/shared/server', () => ({
  createSupabaseServerClient: _createSupabaseServerClient
}));

describe('createSupabaseServerClient', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('creates a server client wired to SvelteKit cookie helpers', async () => {
    _createSupabaseServerClient.mockReturnValue({ client: true });

    const { createSupabaseServerClient } = await import('./supabase');
    const event = {
      cookies: {
        get: vi.fn(() => 'cookie-value'),
        set: vi.fn(),
        delete: vi.fn()
      }
    } as any;

    const client = createSupabaseServerClient(event);

    expect(client).toEqual({ client: true });
    expect(_createSupabaseServerClient).toHaveBeenCalledWith(
      'https://supabase.test',
      'anon-key',
      event
    );
  });
});
