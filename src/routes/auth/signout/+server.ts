import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals }) => {
	const { error } = await locals.supabase.auth.signOut();

	if (error) {
		console.error('Sign out error', error);
		return new Response('로그아웃에 실패했습니다.', { status: 500 });
	}

	throw redirect(303, '/');
};
