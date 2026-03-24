import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSafeNextPath } from '$lib/server/auth';

export const GET: RequestHandler = async ({ url, locals }) => {
  const code = url.searchParams.get('code');
  const nextPath = getSafeNextPath(url.searchParams.get('next'));

  if (code) {
    const { error } = await locals.supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Auth code exchange error', error);
      throw redirect(303, '/auth/login?error=callback');
    }
  }

  const session = await locals.getSession();

  if (!session) {
    throw redirect(303, '/auth/login?error=session');
  }

  const { data: profile } = await locals.supabase
    .from('profiles')
    .select('is_admin')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    await locals.supabase.auth.signOut();
    throw redirect(303, '/auth/login?error=not-admin');
  }

  throw redirect(303, nextPath);
};
