import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdminClient } from './supabaseAdmin';

let cachedHasEmailColumn: boolean | null = null;

const PROFILE_TABLE = 'profiles';
const EMAIL_COLUMN = 'email';

const isColumnMissingError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: string }).code === '42703';

export const hasProfileEmailColumn = async (supabase?: SupabaseClient | null): Promise<boolean> => {
  if (cachedHasEmailColumn !== null) {
    return cachedHasEmailColumn;
  }

  const client = getSupabaseAdminClient() ?? supabase;

  if (!client) {
    console.warn(
      '[profiles] No Supabase client available to verify email column; assuming unavailable.'
    );
    cachedHasEmailColumn = false;
    return false;
  }

  const { error } = await client
    .from(PROFILE_TABLE)
    .select(EMAIL_COLUMN, { head: true, count: 'exact' })
    .limit(1);

  if (error) {
    if (isColumnMissingError(error)) {
      console.warn(
        '[profiles] email column is not available; email notifications will be skipped.'
      );
      cachedHasEmailColumn = false;
      return false;
    }

    console.error('[profiles] Failed to detect email column availability', error);
    cachedHasEmailColumn = false;
    return false;
  }

  cachedHasEmailColumn = true;
  return true;
};
