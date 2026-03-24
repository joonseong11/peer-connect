import { beforeEach, describe, expect, it, vi } from 'vitest';

const envState = {
  serviceRole: ''
};

const { createClient, getSupabaseConfig } = vi.hoisted(() => ({
  createClient: vi.fn(),
  getSupabaseConfig: vi.fn()
}));

vi.mock('$env/static/private', () => ({
  get SUPABASE_SERVICE_ROLE_KEY() {
    return envState.serviceRole;
  }
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient
}));

vi.mock('$lib/supabase/config', () => ({
  getSupabaseConfig
}));

describe('getSupabaseAdminClient', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    envState.serviceRole = '';
    getSupabaseConfig.mockReturnValue({
      supabaseUrl: 'https://supabase.test'
    });
  });

  it('returns null and only warns once when the service role key is missing', async () => {
    const { getSupabaseAdminClient } = await import('./supabaseAdmin');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(getSupabaseAdminClient()).toBeNull();
    expect(getSupabaseAdminClient()).toBeNull();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('creates and caches the admin client when the service role key is present', async () => {
    envState.serviceRole = 'service-role-key';
    createClient.mockReturnValue({ admin: true });

    const { getSupabaseAdminClient } = await import('./supabaseAdmin');

    expect(getSupabaseAdminClient()).toEqual({ admin: true });
    expect(getSupabaseAdminClient()).toEqual({ admin: true });
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledWith('https://supabase.test', 'service-role-key', {
      auth: {
        persistSession: false
      }
    });
  });
});
