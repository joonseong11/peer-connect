import { createServerClient } from '@supabase/ssr';
import type { RequestEvent } from '@sveltejs/kit';

export const createSupabaseServerClient = (
  supabaseUrl: string,
  supabaseAnonKey: string,
  event: RequestEvent
) => {
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (key) => event.cookies.get(key),
      set: (key, value, options) => {
        event.cookies.set(key, value, { ...options, path: '/' });
      },
      remove: (key, options) => {
        event.cookies.delete(key, { ...options, path: '/' });
      }
    }
  });

  return supabase;
};
