import { redirect, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, url }) => {
	const { data, error } = await locals.supabase.auth.signInWithOAuth({
		provider: 'google',
		options: {
			redirectTo: `${url.origin}/auth/callback`
		}
	});

	if (error || !data?.url) {
		console.error('Google sign-in error', error);
		return json({ message: '로그인을 시작하지 못했습니다.' }, { status: 500 });
	}

	throw redirect(303, data.url);
};
