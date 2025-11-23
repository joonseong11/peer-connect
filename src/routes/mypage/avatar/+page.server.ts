import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const PROFILE_PHOTO_BUCKET = 'profile-photos';
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.getSession();

	if (!session) {
		throw redirect(303, '/?authError=signin-required');
	}

	const { data: profile, error } = await locals.supabase
		.from('profiles')
		.select('photo_url')
		.eq('user_id', session.user.id)
		.maybeSingle();

	if (error) {
		console.error('Failed to load profile for avatar', error);
		return {
			session,
			profile: null,
			loadError: '프로필 정보를 불러오지 못했습니다.'
		};
	}

	return {
		session,
		profile,
		loadError: null
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const session = await locals.getSession();

		if (!session) {
			throw redirect(303, '/?authError=signin-required');
		}

		const formData = await request.formData();
		const avatar = formData.get('avatar');

		if (!avatar || !(avatar instanceof File) || avatar.size === 0) {
			return fail(400, {
				success: false,
				error: '이미지를 선택해주세요.'
			});
		}

		if (avatar.size > MAX_PHOTO_SIZE) {
			return fail(400, {
				success: false,
				error: '이미지 용량은 5MB 이하만 업로드할 수 있습니다.'
			});
		}

		if (!avatar.type.startsWith('image/')) {
			return fail(400, {
				success: false,
				error: '이미지 파일만 업로드할 수 있습니다.'
			});
		}

		const extension = avatar.name.split('.').pop()?.toLowerCase() ?? 'png';
		const filePath = `${session.user.id}/${crypto.randomUUID()}.${extension}`;

		const { error: uploadError } = await locals.supabase.storage
			.from(PROFILE_PHOTO_BUCKET)
			.upload(filePath, avatar, {
				upsert: true,
				contentType: avatar.type
			});

		if (uploadError) {
			console.error('Failed to upload profile photo', uploadError);
			return fail(500, {
				success: false,
				error: '프로필 이미지를 업로드하지 못했습니다. 잠시 후 다시 시도해주세요.'
			});
		}

		const {
			data: { publicUrl }
		} = locals.supabase.storage.from(PROFILE_PHOTO_BUCKET).getPublicUrl(filePath);

		const { error: updateError } = await locals.supabase
			.from('profiles')
			.update({ photo_url: publicUrl, updated_at: new Date().toISOString() })
			.eq('user_id', session.user.id);

		if (updateError) {
			console.error('Failed to update profile with photo url', updateError);
			return fail(500, {
				success: false,
				error: '프로필 정보를 업데이트하지 못했습니다.'
			});
		}

		return {
			success: true,
			photo_url: publicUrl
		};
	}
};
