import { redirect, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, url }) => {
  const nextParamRaw = url.searchParams.get('next');
  const nextParam = nextParamRaw && nextParamRaw.startsWith('/') ? nextParamRaw : null;
  const redirectSuffix = nextParam ? `?next=${encodeURIComponent(nextParam)}` : '';
  const { data, error } = await locals.supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${url.origin}/auth/callback${redirectSuffix}`
    }
  });

  if (error || !data?.url) {
    console.error('Google sign-in error', error);
    return json({ message: '로그인을 시작하지 못했습니다.' }, { status: 500 });
  }

  throw redirect(303, data.url);
};

// Also allow GET for direct links (like from public profile "Login" button)
export const GET: RequestHandler = async (event) => {
  return POST(event);
};
