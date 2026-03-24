import { env } from '$env/dynamic/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import {
  createSupabaseServerClient as _createSupabaseServerClient,
  createSupabaseAdminClient
} from '@peer/shared/server';
import type { RequestEvent } from '@sveltejs/kit';

const getConfig = () => {
  const supabaseUrl = env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('PUBLIC_SUPABASE_URL 또는 PUBLIC_SUPABASE_ANON_KEY가 설정되지 않았습니다.');
  }

  return { supabaseUrl, supabaseAnonKey };
};

export const createSupabaseServerClient = (event: RequestEvent) => {
  const { supabaseUrl, supabaseAnonKey } = getConfig();
  return _createSupabaseServerClient(supabaseUrl, supabaseAnonKey, event);
};

export const getSupabaseAdminClient = () => {
  const { supabaseUrl } = getConfig();
  return createSupabaseAdminClient(supabaseUrl, SUPABASE_SERVICE_ROLE_KEY);
};
