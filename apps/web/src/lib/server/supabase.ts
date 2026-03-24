import { env } from '$env/dynamic/public';
import { createSupabaseServerClient as _createSupabaseServerClient } from '@peer/shared/server';
import type { RequestEvent } from '@sveltejs/kit';

export const createSupabaseServerClient = (event: RequestEvent) => {
  const supabaseUrl = env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'PUBLIC_SUPABASE_URL 또는 PUBLIC_SUPABASE_ANON_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.'
    );
  }

  return _createSupabaseServerClient(supabaseUrl, supabaseAnonKey, event);
};
