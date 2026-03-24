import { redirect, type Handle } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/server/supabase';

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
    throw redirect(303, '/auth/login');
  }

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', session.user.id)
    .single();

  if (!profile?.is_admin) {
    throw redirect(303, '/auth/signout');
  }

  return resolve(event);
};
