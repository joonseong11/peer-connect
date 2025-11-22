import { fail, redirect } from '@sveltejs/kit';
import { getSupabaseAdminClient } from '$lib/server/supabaseAdmin';
import { hasProfileEmailColumn } from '$lib/server/profileEmailColumn';
import { normalizeEmail } from '$lib/utils/normalizeEmail';
import { getProfileFallbacks } from '$lib/server/profileDefaults';
import type { Actions, PageServerLoad } from './$types';

type NotificationPreferences = {
	endorsements: boolean;
	gatherings: boolean;
	comments: boolean;
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
	endorsements: true,
	gatherings: true,
	comments: true
};

const COLUMN_MAP = {
	endorsements: 'notify_endorsements',
	gatherings: 'notify_gatherings',
	comments: 'notify_comments'
} as const satisfies Record<keyof typeof DEFAULT_PREFERENCES, string>;

const isColumnMissingError = (error: unknown) =>
	typeof error === 'object' &&
	error !== null &&
	'code' in error &&
	(error as { code?: string }).code === '42703';

const isPermissionError = (error: unknown) =>
	typeof error === 'object' &&
	error !== null &&
	'code' in error &&
	(error as { code?: string }).code === '42501';

const isTableMissingError = (error: unknown) =>
	typeof error === 'object' &&
	error !== null &&
	'code' in error &&
	(error as { code?: string }).code === '42P01';

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.getSession();

	if (!session) {
		throw redirect(303, '/?authError=signin-required');
	}

	let preferences: NotificationPreferences = { ...DEFAULT_PREFERENCES };
	let loadError: string | null = null;
	let preferencesAvailable = true;
        let profileExists = false;

	const {
		data: profile,
		error: profileError
	} = await locals.supabase
		.from('profiles')
		.select('user_id, notify_endorsements, notify_gatherings, notify_comments, updated_at')
		.eq('user_id', session.user.id)
		.maybeSingle();

	if (profileError) {
		if (isColumnMissingError(profileError)) {
			console.warn(
				'[mypage] Notification preference columns are missing in profiles table; falling back to defaults.'
			);
			preferencesAvailable = false;
		} else {
			console.error('[mypage] Failed to load notification preferences', profileError);
			loadError = '알림 설정을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
		}
	} else if (profile) {
		profileExists = true;
		const notificationRow = profile as unknown as {
			user_id?: string;
			notify_endorsements?: boolean | null;
			notify_gatherings?: boolean | null;
			notify_comments?: boolean | null;
		};

		preferences = {
			endorsements:
				notificationRow.notify_endorsements ?? DEFAULT_PREFERENCES.endorsements,
			gatherings: notificationRow.notify_gatherings ?? DEFAULT_PREFERENCES.gatherings,
			comments: notificationRow.notify_comments ?? DEFAULT_PREFERENCES.comments
		};
	}

	const canUseAdminClient = Boolean(getSupabaseAdminClient());

	return {
		session,
		preferences,
		preferencesAvailable,
		loadError,
                profileExists,
                adminClientAvailable: canUseAdminClient
        };
};

const parseBooleanField = (
	values: FormDataEntryValue[],
	fallback: boolean
): boolean => {
	if (values.length === 0) return fallback;
	
	// The last value is the one that counts (checkbox overrides hidden input)
	const value = values[values.length - 1];
	if (typeof value === 'string') return value === 'true';

	return fallback;
};

const parsePreferences = (formData: FormData): NotificationPreferences => ({
	endorsements: parseBooleanField(formData.getAll(COLUMN_MAP.endorsements), DEFAULT_PREFERENCES.endorsements),
	gatherings: parseBooleanField(formData.getAll(COLUMN_MAP.gatherings), DEFAULT_PREFERENCES.gatherings),
	comments: parseBooleanField(formData.getAll(COLUMN_MAP.comments), DEFAULT_PREFERENCES.comments)
});

export const actions: Actions = {
	updatePreferences: async ({ request, locals }) => {
		const session = await locals.getSession();

		if (!session) {
			throw redirect(303, '/?authError=signin-required');
		}

                const formData = await request.formData();
                const preferences = parsePreferences(formData);

                const emailColumnAvailable = await hasProfileEmailColumn(locals.supabase);
                const normalizedEmail = normalizeEmail(session.user.email ?? null);

                const { data: existingProfile, error: profileLookupError } = await locals.supabase
                        .from('profiles')
                        .select('user_id')
                        .eq('user_id', session.user.id)
                        .maybeSingle();

                if (profileLookupError) {
                        console.error(
                                '[mypage] Failed to verify existing profile before updating notification preferences',
                                profileLookupError
                        );
                        return fail(500, {
                                preferences,
                                updateError: '알림 설정을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.'
                        });
                }

                if (!existingProfile) {
                        const { full_name: fallbackName, role: fallbackRole } = getProfileFallbacks(session);
                        const profilePayload: Record<string, unknown> = {
                                user_id: session.user.id,
                                full_name: fallbackName,
                                role: fallbackRole
                        };

                        if (emailColumnAvailable && normalizedEmail) {
                                profilePayload.email = normalizedEmail;
                        }

                        const { error: createProfileError } = await locals.supabase
                                .from('profiles')
                                .insert(profilePayload);

                        if (createProfileError) {
                                console.error(
                                        '[mypage] Failed to create default profile before updating notification preferences',
                                        createProfileError
                                );
                                return fail(500, {
                                        preferences,
                                        updateError: '알림 설정을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.'
                                });
                        }
                }

                const payload: Record<string, unknown> = {
                        [COLUMN_MAP.endorsements]: preferences.endorsements,
                        [COLUMN_MAP.gatherings]: preferences.gatherings,
                        [COLUMN_MAP.comments]: preferences.comments,
                        updated_at: new Date().toISOString()
                };

                if (emailColumnAvailable && normalizedEmail) {
                        payload.email = normalizedEmail;
                }

                const { error } = await locals.supabase
                        .from('profiles')
                        .update(payload)
                        .eq('user_id', session.user.id);

		if (error) {
			if (isColumnMissingError(error)) {
				return fail(500, {
					preferences,
					updateError:
						'알림 설정 컬럼이 준비되지 않았습니다. 데이터베이스에 notify_* 컬럼을 추가해주세요.'
				});
			}

			console.error('[mypage] Failed to update notification preferences', error);
			return fail(500, {
				preferences,
				updateError: '알림 설정을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.'
			});
		}

		return {
			success: true,
			preferences,
			message: '알림 설정을 저장했습니다.'
		};
	},
	deleteAccount: async ({ locals }) => {
		const session = await locals.getSession();

		if (!session) {
			throw redirect(303, '/?authError=signin-required');
		}

		const adminClient = getSupabaseAdminClient();

		if (!adminClient) {
			return fail(500, {
				deleteError:
					'계정 삭제를 완료하려면 서버 환경 변수 SUPABASE_SERVICE_ROLE_KEY를 설정해주세요.'
			});
		}

		const userId = session.user.id;

		const deleteEndorsements = await adminClient
			.from('endorsements')
			.delete()
			.or(`author_id.eq.${userId},target_user_id.eq.${userId}`);

		if (
			deleteEndorsements.error &&
			!isPermissionError(deleteEndorsements.error) &&
			!isTableMissingError(deleteEndorsements.error)
		) {
			console.error('[mypage] Failed to delete endorsements during account cleanup', deleteEndorsements.error);
			return fail(500, {
				deleteError: '추천 기록을 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.'
			});
		}

		const deleteInviteRedemptions = await adminClient
			.from('invite_redemptions')
			.delete()
			.eq('invitee_user_id', userId);

		if (
			deleteInviteRedemptions.error &&
			!isPermissionError(deleteInviteRedemptions.error) &&
			!isTableMissingError(deleteInviteRedemptions.error)
		) {
			console.error(
				'[mypage] Failed to delete invite redemptions during account cleanup',
				deleteInviteRedemptions.error
			);
			return fail(500, {
				deleteError: '초대 사용 기록을 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.'
			});
		}

		const deleteInvites = await adminClient
			.from('invites')
			.delete()
			.or(`inviter_user_id.eq.${userId},redeemed_by.eq.${userId}`);

		if (
			deleteInvites.error &&
			!isPermissionError(deleteInvites.error) &&
			!isTableMissingError(deleteInvites.error)
		) {
			console.error('[mypage] Failed to delete invites during account cleanup', deleteInvites.error);
			return fail(500, {
				deleteError: '초대 기록을 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.'
			});
		}

		const deleteProfile = await adminClient.from('profiles').delete().eq('user_id', userId);

		if (deleteProfile.error && !isPermissionError(deleteProfile.error)) {
			console.error('[mypage] Failed to delete profile during account cleanup', deleteProfile.error);
			return fail(500, {
				deleteError: '프로필을 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.'
			});
		}

		const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);

		if (deleteUserError) {
			console.error('[mypage] Failed to delete auth user during account cleanup', deleteUserError);
			return fail(500, {
				deleteError: 'Supabase 인증 계정을 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.'
			});
		}

		const { error: signOutError } = await locals.supabase.auth.signOut();

		if (signOutError) {
			console.error('[mypage] Failed to sign out after account deletion', signOutError);
		}

		throw redirect(303, '/?accountStatus=deleted');
	}
};
