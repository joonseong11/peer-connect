import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/';
  const defaultRedirect = next.startsWith('/') ? next : '/';

  if (code) {
    const { error } = await locals.supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Auth code exchange error', error);
      throw redirect(303, '/?authError=google');
    }

    const session = await locals.getSession();
    if (session) {
      const { data: profile } = await locals.supabase
        .from('profiles')
        .select('profile_completed_at')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!profile?.profile_completed_at) {
        throw redirect(303, '/profile?onboarding=1');
      }
    }
  }

  throw redirect(303, defaultRedirect);
};
