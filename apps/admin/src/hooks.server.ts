import { redirect, type Handle } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/server/supabase';
import { getSafeNextPath } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
  const supabase = createSupabaseServerClient(event);
  event.locals.supabase = supabase;

  event.locals.getSession = async () => {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    return session;
  };

  // Allow auth routes without admin check
  if (event.url.pathname.startsWith('/auth/')) {
    return resolve(event);
  }

  const session = await event.locals.getSession();

  // Redirect to login if not authenticated
  if (!session) {
    const nextPath = getSafeNextPath(`${event.url.pathname}${event.url.search}`);
    throw redirect(303, `/auth/login?next=${encodeURIComponent(nextPath)}`);
  }

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    throw redirect(303, '/auth/signout?reason=not-admin');
  }

  return resolve(event);
};
