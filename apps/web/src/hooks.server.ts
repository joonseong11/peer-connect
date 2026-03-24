import type { Handle } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/server/supabase';

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.supabase = createSupabaseServerClient(event);
  event.locals.getSession = async () => {
    const {
      data: { session }
    } = await event.locals.supabase.auth.getSession();

    if (session) {
      const {
        data: { user },
        error: userError
      } = await event.locals.supabase.auth.getUser();

      if (userError) {
        console.error('Failed to verify session user', userError);
      } else if (user) {
        session.user = user;
      }
    }

    return session;
  };

  return resolve(event, {
    filterSerializedResponseHeaders: (name) => name === 'content-range'
  });
};
