import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { env } from '$env/dynamic/public';
import { createSupabaseAdminClient } from '@peer/shared/server';

export const getSupabaseAdminClient = () => {
  const supabaseUrl = env.PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error('PUBLIC_SUPABASE_URL이 설정되지 않았습니다.');
  }

  return createSupabaseAdminClient(supabaseUrl, SUPABASE_SERVICE_ROLE_KEY);
};
