import { redirect } from '@sveltejs/kit';
import { redeemInviteCode } from '$lib/server/invite';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals, cookies }) => {
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/';
  const defaultRedirect = next.startsWith('/') ? next : '/';
  const pendingClaimToken = cookies.get('pending_claim_token');
  const shouldResumeClaim = Boolean(pendingClaimToken) && defaultRedirect.startsWith('/claim/');

  if (code) {
    const { error } = await locals.supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Auth code exchange error', error);
      throw redirect(303, '/?authError=google');
    }

    const session = await locals.getSession();
    if (session) {
      if (pendingClaimToken && !shouldResumeClaim) {
        cookies.delete('pending_claim_token', { path: '/' });
      }

      if (!shouldResumeClaim) {
        // Check for pending invite code logic
        const pendingInviteCode = cookies.get('pending_invite_code');
        if (pendingInviteCode) {
          console.log('[Auth Callback] Found pending invite code, attempting redemption...');
          const result = await redeemInviteCode({
            supabase: locals.supabase,
            session,
            code: pendingInviteCode
          });

          if (result.success) {
            console.log(
              '[Auth Callback] Invite redeemed successfully, redirecting to:',
              result.redirectTo
            );
            cookies.delete('pending_invite_code', { path: '/' });
            throw redirect(303, result.redirectTo);
          } else {
            console.warn('[Auth Callback] Invite redemption failed:', result);
            // If it's a definitive error (invalid, used, etc), clear the cookie so we don't retry loop
            if (result.reason !== 'generic') {
              cookies.delete('pending_invite_code', { path: '/' });
            }
            // If generic error, we keep the cookie and maybe the profile page will try again or user tries again?
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
  }

  throw redirect(303, defaultRedirect);
};
