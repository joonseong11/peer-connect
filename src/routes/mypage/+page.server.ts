import { fail, redirect } from '@sveltejs/kit';
import { getSupabaseAdminClient } from '$lib/server/supabaseAdmin';
import { hasProfileEmailColumn } from '$lib/server/profileEmailColumn';
import { INVITES_ENABLED } from '$lib/config';
import { normalizeEmail } from '$lib/utils/normalizeEmail';
import type { SupabaseClient } from '@supabase/supabase-js';
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
		adminClientAvailable: canUseAdminClient,
		invitesEnabled: INVITES_ENABLED
	};
};

const parsePreferences = (formData: FormData): NotificationPreferences => ({
        endorsements: formData.has(COLUMN_MAP.endorsements),
        gatherings: formData.has(COLUMN_MAP.gatherings),
        comments: formData.has(COLUMN_MAP.comments)
});

const ensureProfileExists = async (client: SupabaseClient, userId: string) => {
        const { count, error } = await client
                .from('profiles')
                .select('user_id', { head: true, count: 'exact' })
                .eq('user_id', userId);

        if (error) {
                return { count: null as number | null, error };
        }

        return { count, error: null };
};

export const actions: Actions = {
	updatePreferences: async ({ request, locals }) => {
		const session = await locals.getSession();

		if (!session) {
			throw redirect(303, '/?authError=signin-required');
		}

                const formData = await request.formData();
                const preferences = parsePreferences(formData);

                const emailColumnAvailable = await hasProfileEmailColumn(locals.supabase);

                const payload: Record<string, unknown> = {
                        user_id: session.user.id,
                        [COLUMN_MAP.endorsements]: preferences.endorsements,
                        [COLUMN_MAP.gatherings]: preferences.gatherings,
                        [COLUMN_MAP.comments]: preferences.comments,
                        updated_at: new Date().toISOString()
                };

                if (emailColumnAvailable) {
                        payload.email = normalizeEmail(session.user.email ?? null);
                }

                const adminClient = getSupabaseAdminClient();
                const targetClient = locals.supabase;
                const { count: profileCount, error: profileCountError } = await ensureProfileExists(
                        targetClient,
                        session.user.id
                );

                if (profileCountError) {
                        if (isColumnMissingError(profileCountError)) {
                                return fail(500, {
                                        preferences,
                                        updateError:
                                                '알림 설정 컬럼이 준비되지 않았습니다. 데이터베이스에 notify_* 컬럼을 추가해주세요.'
                                });
                        }

                        console.error('[mypage] Failed to check profile existence', profileCountError);
                        return fail(500, {
                                preferences,
                                updateError: '알림 설정을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.'
                        });
                }

                const shouldInsert = !profileCount || profileCount < 1;

                const performUpsert = async (client: SupabaseClient) => {
                        if (shouldInsert) {
                                return client.from('profiles').insert(payload, { returning: 'minimal' });
                        }

                        return client
                                .from('profiles')
                                .update(payload, { returning: 'minimal' })
                                .eq('user_id', session.user.id);
                };

                let { error: writeError } = await performUpsert(targetClient);

                if (writeError && isPermissionError(writeError) && adminClient) {
                        ({ error: writeError } = await performUpsert(adminClient));
                }

                if (writeError) {
                        if (isColumnMissingError(writeError)) {
                                return fail(500, {
                                        preferences,
                                        updateError:
                                                '알림 설정 컬럼이 준비되지 않았습니다. 데이터베이스에 notify_* 컬럼을 추가해주세요.'
                                });
                        }

                        console.error('[mypage] Failed to upsert notification preferences', writeError);
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
