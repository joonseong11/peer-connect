import { redirect } from '@sveltejs/kit';
import { INVITES_ENABLED } from '$lib/config';
import { hasProfileEmailColumn } from '$lib/server/profileEmailColumn';
import { normalizeEmail } from '$lib/utils/normalizeEmail';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const session = await locals.getSession();

	if (!session) {
		return { session: null, invite: null };
	}

	let requiresProfileCompletion = false;

        try {
                const emailColumnAvailable = await hasProfileEmailColumn(locals.supabase);
                const oauthEmail = normalizeEmail(session.user.email ?? null);

                const baseProfileColumns = 'user_id, profile_completed_at';
                const selectColumns = emailColumnAvailable
                        ? `${baseProfileColumns}, email, contact_email`
                        : baseProfileColumns;

                const {
                        data: existingProfile,
                        error: profileLookupError
                } = await locals.supabase
                        .from('profiles')
                        .select(selectColumns)
                        .eq('user_id', session.user.id)
                        .maybeSingle();

                const profileRecord = existingProfile as
                        | {
                                  user_id: string;
                                  email?: string | null;
                                  contact_email?: string | null;
                                  profile_completed_at?: string | null;
                          }
                        | null;
		if (!profileLookupError) {
			requiresProfileCompletion = !profileRecord?.profile_completed_at;
		}

                if (!profileLookupError && !profileRecord) {
                        const fallbackName =
                                typeof session.user.user_metadata?.full_name === 'string' &&
                                session.user.user_metadata.full_name.trim().length > 0
                                        ? session.user.user_metadata.full_name.trim()
					: session.user.email ?? '새 멤버';
			const fallbackRole =
				typeof session.user.user_metadata?.title === 'string' &&
                                session.user.user_metadata.title.trim().length > 0
                                        ? session.user.user_metadata.title.trim()
                                        : '직무 미정';

                        const profilePayload: Record<string, unknown> = {
                                user_id: session.user.id,
                                full_name: fallbackName,
                                role: fallbackRole
                        };

                        if (emailColumnAvailable) {
                                profilePayload.email = oauthEmail;
                        }

                        const { error: createProfileError } = await locals.supabase
                                .from('profiles')
                                .insert(profilePayload);

                        if (createProfileError) {
                                console.error('Failed to create default profile during onboarding', createProfileError);
                        }
			requiresProfileCompletion = true;
                } else if (
                        !profileLookupError &&
                        emailColumnAvailable &&
                        profileRecord &&
                        oauthEmail
                ) {
                        const storedProfileEmail = normalizeEmail(profileRecord.email ?? null);

                        if (storedProfileEmail !== oauthEmail) {
                                const previousEmailRaw =
                                        typeof profileRecord.email === 'string' && profileRecord.email.trim().length > 0
                                                ? profileRecord.email.trim()
                                                : null;
                                const previousEmailNormalized = storedProfileEmail;
                                const existingContactEmail =
                                        typeof profileRecord.contact_email === 'string' &&
                                        profileRecord.contact_email.trim().length > 0
                                                ? profileRecord.contact_email.trim()
                                                : null;

                                const updatePayload: Record<string, string | null> = {
                                        email: oauthEmail
                                };

                                if (
                                        previousEmailRaw &&
                                        previousEmailNormalized &&
                                        previousEmailNormalized !== oauthEmail &&
                                        !existingContactEmail
                                ) {
                                        updatePayload.contact_email = previousEmailRaw;
                                }

                                const { error: syncProfileEmailError } = await locals.supabase
                                        .from('profiles')
                                        .update(updatePayload)
                                        .eq('user_id', session.user.id);

                                if (syncProfileEmailError) {
                                        console.error(
                                                'Failed to sync profile email with OAuth email',
                                                syncProfileEmailError
                                        );
                                }
                        }
			requiresProfileCompletion = !profileRecord.profile_completed_at;
                } else if (profileLookupError) {
                        console.error('Failed to verify profile existence during onboarding', profileLookupError);
                }
        } catch (error) {
		console.error('Unexpected error while ensuring profile record', error);
	}

	const {
		data: redeemedInvite,
		error
	} = await locals.supabase
		.from('invite_redemptions')
		.select('id, invite_id, invite:invites!inner(inviter_user_id)')
		.eq('invitee_user_id', session.user.id)
		.order('redeemed_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	if (error) {
		console.error('Failed to verify invite linkage', error);
	}

	const rawInvite = redeemedInvite
		? Array.isArray(redeemedInvite.invite)
			? redeemedInvite.invite[0]
			: redeemedInvite.invite
		: null;

	const redemptionPayload = redeemedInvite && rawInvite
		? {
				redemption_id: String(redeemedInvite.id),
				invite_id: String(redeemedInvite.invite_id),
				inviter_user_id: rawInvite.inviter_user_id
					? String(rawInvite.inviter_user_id)
					: null
			}
		: null;

	const requireInvite = INVITES_ENABLED && !redemptionPayload;
	const isInvitePage = url.pathname.startsWith('/invite');
	const isProfilePage = url.pathname.startsWith('/profile');
	const isAuthRoute = url.pathname.startsWith('/auth');

	if (requireInvite && !isInvitePage && !isProfilePage && !isAuthRoute) {
		throw redirect(303, '/invite');
	}

	if (!requireInvite && requiresProfileCompletion && !isProfilePage && !isAuthRoute) {
		throw redirect(303, '/profile?onboarding=1');
	}

	return {
		session,
		invite: redemptionPayload,
		invitesEnabled: INVITES_ENABLED
	};
};
