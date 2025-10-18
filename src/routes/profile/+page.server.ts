import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { hasProfileEmailColumn } from '$lib/server/profileEmailColumn';

const PROFILE_FIELDS = [
	'full_name',
	'role',
	'career_history',
	'introduction',
	'contact_linkedin',
	'contact_github',
	'contact_email'
] as const;

type ProfileField = (typeof PROFILE_FIELDS)[number];
type ProfileErrors = Partial<Record<ProfileField | 'avatar', string>>;

const PROFILE_PHOTO_BUCKET = 'profile-photos';
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.getSession();

	if (!session) {
		throw redirect(303, '/?authError=signin-required');
	}

	const emailColumnAvailable = await hasProfileEmailColumn(locals.supabase);

	const baseColumns =
		'full_name, role, career_history, introduction, contact_linkedin, contact_github, contact_email, updated_at, photo_url';
	const selectColumns = emailColumnAvailable ? `${baseColumns}, email` : baseColumns;

	const {
		data: profile,
		error
	} = await locals.supabase
		.from('profiles')
		.select(selectColumns)
		.eq('user_id', session.user.id)
		.maybeSingle();

	if (error) {
		console.error('Failed to load profile', error);
		return {
			session,
			profile: null,
			loadError: '프로필 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
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

		const emailColumnAvailable = await hasProfileEmailColumn(locals.supabase);

		const { data: currentProfile } = await locals.supabase
			.from('profiles')
			.select('photo_url')
			.eq('user_id', session.user.id)
			.maybeSingle();

		const formData = await request.formData();
		const values = PROFILE_FIELDS.reduce<Record<ProfileField, string>>((acc, key) => {
			const value = (formData.get(key) ?? '').toString().trim();
			acc[key] = value;
			return acc;
		}, {} as Record<ProfileField, string>);

		const errors: ProfileErrors = {};

		const isValidUrl = (value: string) => {
			try {
				const url = new URL(value);
				return url.protocol === 'https:' || url.protocol === 'http:';
			} catch {
				return false;
			}
		};

		if (values.contact_linkedin && !isValidUrl(values.contact_linkedin)) {
			errors.contact_linkedin = '유효한 URL을 입력해주세요.';
		}

		if (values.contact_github && !isValidUrl(values.contact_github)) {
			errors.contact_github = '유효한 URL을 입력해주세요.';
		}

		if (
			values.contact_email &&
			!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.contact_email)
		) {
			errors.contact_email = '유효한 이메일 주소를 입력해주세요.';
		}

		let photoUrl = currentProfile?.photo_url ?? null;
		const avatar = formData.get('avatar');

		if (!values.full_name) {
			errors.full_name = '이름을 입력해주세요.';
		}

		if (!values.role) {
			errors.role = '직군 및 포지션을 입력해주세요.';
		}

		if (avatar instanceof File && avatar.size > 0) {
			if (avatar.size > MAX_PHOTO_SIZE) {
				errors.avatar = '이미지 용량은 5MB 이하만 업로드할 수 있습니다.';
			} else if (!avatar.type.startsWith('image/')) {
				errors.avatar = '이미지 파일만 업로드할 수 있습니다.';
			} else {
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
					errors.avatar = '프로필 이미지를 업로드하지 못했습니다. 잠시 후 다시 시도해주세요.';
				} else {
					const {
						data: { publicUrl }
					} = locals.supabase.storage.from(PROFILE_PHOTO_BUCKET).getPublicUrl(filePath);
					photoUrl = publicUrl;
				}
			}
		}

		if (Object.keys(errors).length > 0) {
			return fail(400, {
				success: false,
				errors,
				values: { ...values, photo_url: photoUrl }
			});
		}

		const payload: Record<string, unknown> = {
			user_id: session.user.id,
			full_name: values.full_name,
			role: values.role,
			career_history: values.career_history,
			introduction: values.introduction,
			contact_linkedin: values.contact_linkedin || null,
			contact_github: values.contact_github || null,
			contact_email: values.contact_email || null,
			photo_url: photoUrl,
			updated_at: new Date().toISOString()
		};

		if (emailColumnAvailable) {
			payload.email = session.user.email ?? null;
		}

		const { error } = await locals.supabase.from('profiles').upsert(payload, {
			onConflict: 'user_id'
		});

		if (error) {
			console.error('Failed to upsert profile', error);
			return fail(500, {
				success: false,
				serverMessage: '프로필 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
				values
			});
		}

		return {
			success: true,
			values: { ...values, photo_url: photoUrl }
		};
	}
};
