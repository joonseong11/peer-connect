import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => {
	const authError = url.searchParams.get('authError');

	return {
		authErrorMessage: authError ? 'Google 로그인에 실패했습니다. 다시 시도해주세요.' : null
	};
};

export const prerender = false;
