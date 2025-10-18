import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

type ProfileRow = {
	user_id: string;
	full_name: string;
	role: string;
	introduction: string | null;
	updated_at: string | null;
	photo_url: string | null;
};

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.getSession();

	if (!session) {
		throw redirect(303, '/?authError=signin-required');
	}

	const {
		data,
		error
	} = await locals.supabase
		.from('profiles')
		.select('user_id, full_name, role, introduction, updated_at, photo_url')
		.order('updated_at', { ascending: false });

	if (error) {
		console.error('Failed to load members', error);
		return {
			session,
			profiles: [],
			loadError: '동료 프로필을 불러오지 못했습니다. Supabase RLS 정책에서 profiles 테이블 읽기 권한이 열려 있는지 확인해주세요.'
		};
	}

	const {
		data: endorsementRows,
		error: endorsementError
	} = await locals.supabase
		.from('endorsements')
		.select('target_user_id, content, created_at')
		.order('created_at', { ascending: true });

	if (endorsementError) {
		console.error('Failed to load endorsement counts', endorsementError);
	}

	type EndorsementInfo = {
		count: number;
		firstContent: string | null;
	};

	const endorsementsByTarget = new Map<string, EndorsementInfo>();
	for (const row of ((endorsementRows as { target_user_id: string; content: string | null }[] | null) ?? [])) {
		const existing = endorsementsByTarget.get(row.target_user_id) ?? {
			count: 0,
			firstContent: null
		};
		const updatedCount = existing.count + 1;
		const firstContent = existing.firstContent ?? row.content ?? null;
		endorsementsByTarget.set(row.target_user_id, {
			count: updatedCount,
			firstContent
		});
	}

	const profiles = (data as ProfileRow[])
		.filter((profile) => profile.user_id !== session.user.id)
		.map((rest) => ({
			...rest,
			introduction: rest.introduction ?? '',
			photo_url: rest.photo_url ?? null,
			endorsement_count: endorsementsByTarget.get(rest.user_id)?.count ?? 0,
			first_endorsement: endorsementsByTarget.get(rest.user_id)?.firstContent ?? null
		}));

	return {
		session,
		profiles,
		loadError: endorsementError ? '추천 수를 일부 불러오지 못했습니다.' : null
	};
};
