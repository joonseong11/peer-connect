import type { Handle } from '@sveltejs/kit';
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
    if (event.url.pathname !== '/') {
      return new Response(null, {
        status: 303,
        headers: { location: '/auth/login' }
      });
    }
  }

  // Check admin role for authenticated users
  if (session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();

    if (!profile?.is_admin) {
      return new Response(
        '<html><body><h1>403 — 접근 권한이 없습니다</h1><p>관리자만 접근할 수 있습니다.</p><a href="/auth/signout">로그아웃</a></body></html>',
        {
          status: 403,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        }
      );
    }
  }

  return resolve(event);
};
