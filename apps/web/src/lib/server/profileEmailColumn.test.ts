import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryBuilder, createSupabaseFromQueue } from '../../test/support/supabase';

const { getSupabaseAdminClient } = vi.hoisted(() => ({
  getSupabaseAdminClient: vi.fn()
}));

vi.mock('./supabaseAdmin', () => ({
  getSupabaseAdminClient
}));

describe('hasProfileEmailColumn', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns false when no Supabase client is available', async () => {
    getSupabaseAdminClient.mockReturnValue(null);

    const { hasProfileEmailColumn } = await import('./profileEmailColumn');

    await expect(hasProfileEmailColumn()).resolves.toBe(false);
  });

  it('returns false when the email column is missing', async () => {
    getSupabaseAdminClient.mockReturnValue(null);

    const supabase = createSupabaseFromQueue([
      {
        table: 'profiles',
        builder: createQueryBuilder({
          awaited: { error: { code: '42703' } }
        })
      }
    ]);

    const { hasProfileEmailColumn } = await import('./profileEmailColumn');

    await expect(hasProfileEmailColumn(supabase as any)).resolves.toBe(false);
  });

  it('caches successful lookups', async () => {
    getSupabaseAdminClient.mockReturnValue(null);

    const supabase = createSupabaseFromQueue([
      {
        table: 'profiles',
        builder: createQueryBuilder({
          awaited: { error: null }
        })
      }
    ]);

    const { hasProfileEmailColumn } = await import('./profileEmailColumn');

    await expect(hasProfileEmailColumn(supabase as any)).resolves.toBe(true);
    await expect(hasProfileEmailColumn(supabase as any)).resolves.toBe(true);
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });
});
