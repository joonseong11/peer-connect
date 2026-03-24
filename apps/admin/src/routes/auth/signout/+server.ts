import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const signOut: RequestHandler = async ({ locals, url }) => {
  const { error } = await locals.supabase.auth.signOut();

  if (error) {
    console.error('Sign out error', error);
    return new Response('로그아웃에 실패했습니다.', { status: 500 });
  }

  const reason = url.searchParams.get('reason');
  const loginUrl = new URL('/auth/login', url.origin);

  if (reason === 'not-admin') {
    loginUrl.searchParams.set('error', 'not-admin');
  }

  throw redirect(303, `${loginUrl.pathname}${loginUrl.search}`);
};

export const GET = signOut;
export const POST = signOut;
