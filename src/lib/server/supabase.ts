import { createServerClient } from '@supabase/ssr';
import type { RequestEvent } from '@sveltejs/kit';
import { getSupabaseConfig } from '$lib/supabase/config';

export const createSupabaseServerClient = (event: RequestEvent) => {
	const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();

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
