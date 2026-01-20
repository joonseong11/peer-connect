import { redirect } from '@sveltejs/kit';
import { redeemInviteCode } from '$lib/server/invite';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals, cookies }) => {
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
      // Check for pending invite code logic
      const pendingInviteCode = cookies.get('pending_invite_code');
      if (pendingInviteCode) {
        cookies.delete('pending_invite_code', { path: '/' });
        const result = await redeemInviteCode({
          supabase: locals.supabase,
          session,
          code: pendingInviteCode
        });

        if (result.success) {
          throw redirect(303, result.redirectTo);
        } else {
          // If failed, maybe we still want to redirect to the original destination but with a status?
          // Or just proceed as normal but maybe log the error?
          // For now, let's proceed to profile check or default redirect, maybe could append status query param
          // But appending to defaultRedirect might be complex if it already has params.
          // Let's just proceed.
          console.warn('Pending invite redemption failed during callback', result);
        }
      }

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
