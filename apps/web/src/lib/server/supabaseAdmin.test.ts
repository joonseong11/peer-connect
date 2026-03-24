import { beforeEach, describe, expect, it, vi } from 'vitest';

const envState = {
  serviceRole: ''
};

const { createSupabaseAdminClient } = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn()
}));

vi.mock('$env/static/private', () => ({
  get SUPABASE_SERVICE_ROLE_KEY() {
    return envState.serviceRole;
  }
}));

vi.mock('$env/dynamic/public', () => ({
  env: {
    PUBLIC_SUPABASE_URL: 'https://supabase.test'
  }
}));

vi.mock('@peer/shared/server', () => ({
  createSupabaseAdminClient
}));

describe('getSupabaseAdminClient', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    envState.serviceRole = '';
  });

  it('returns null when the service role key is missing', async () => {
    createSupabaseAdminClient.mockReturnValue(null);

    const { getSupabaseAdminClient } = await import('./supabaseAdmin');

    expect(getSupabaseAdminClient()).toBeNull();
    expect(createSupabaseAdminClient).toHaveBeenCalledWith('https://supabase.test', '');
  });

  it('creates the admin client when the service role key is present', async () => {
    envState.serviceRole = 'service-role-key';
    createSupabaseAdminClient.mockReturnValue({ admin: true });

    const { getSupabaseAdminClient } = await import('./supabaseAdmin');

    expect(getSupabaseAdminClient()).toEqual({ admin: true });
    expect(createSupabaseAdminClient).toHaveBeenCalledWith(
      'https://supabase.test',
      'service-role-key'
    );
  });
});
