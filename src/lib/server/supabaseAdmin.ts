import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '$lib/supabase/config';

let adminClient: SupabaseClient | null = null;
let warnedMissingServiceRole = false;

export const getSupabaseAdminClient = (): SupabaseClient | null => {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    if (!warnedMissingServiceRole) {
      console.warn(
        '[supabase-admin] SUPABASE_SERVICE_ROLE_KEY is not configured; falling back to limited client.'
      );
      warnedMissingServiceRole = true;
    }
    return null;
  }

  if (!adminClient) {
    const { supabaseUrl } = getSupabaseConfig();
    adminClient = createClient(supabaseUrl, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false
      }
    });
  }

  return adminClient;
};
