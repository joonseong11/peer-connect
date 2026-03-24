import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
  const code = url.searchParams.get('code');

  if (code) {
    const { error } = await locals.supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Auth code exchange error', error);
      throw redirect(303, '/?authError=google');
    }
  }

  throw redirect(303, '/');
};
