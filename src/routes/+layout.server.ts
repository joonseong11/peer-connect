import { redirect } from '@sveltejs/kit';
import { INVITES_ENABLED } from '$lib/config';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const session = await locals.getSession();

	if (!session) {
		return { session: null, invite: null };
	}

	try {
		const {
			data: existingProfile,
			error: profileLookupError
		} = await locals.supabase
			.from('profiles')
			.select('user_id')
			.eq('user_id', session.user.id)
			.maybeSingle();

		if (!profileLookupError && !existingProfile) {
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

			const { error: createProfileError } = await locals.supabase.from('profiles').insert({
				user_id: session.user.id,
				full_name: fallbackName,
				role: fallbackRole
			});

			if (createProfileError) {
				console.error('Failed to create default profile during onboarding', createProfileError);
			}
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

	return {
		session,
		invite: redemptionPayload,
		invitesEnabled: INVITES_ENABLED
	};
};
