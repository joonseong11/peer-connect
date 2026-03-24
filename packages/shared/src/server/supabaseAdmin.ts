import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;
let warnedMissingServiceRole = false;

export const createSupabaseAdminClient = (
  supabaseUrl: string,
  serviceRoleKey: string | undefined
): SupabaseClient | null => {
  if (!serviceRoleKey) {
    if (!warnedMissingServiceRole) {
      console.warn(
        '[supabase-admin] SUPABASE_SERVICE_ROLE_KEY is not configured; falling back to limited client.'
      );
      warnedMissingServiceRole = true;
    }
    return null;
  }

  if (!adminClient) {
    adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false
      }
    });
  }

  return adminClient;
};
