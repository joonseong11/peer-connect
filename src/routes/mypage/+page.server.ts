import { redirect } from '@sveltejs/kit';
import { INVITES_ENABLED } from '$lib/config';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
        const session = await locals.getSession();

        if (!session) {
                        throw redirect(303, '/?authError=signin-required');
        }

        const {
                        data: profile,
                        error: profileError
        } = await locals.supabase
                        .from('profiles')
                        .select('user_id, full_name, role, photo_url, updated_at, introduction')
                        .eq('user_id', session.user.id)
                        .maybeSingle();

        if (profileError) {
                        console.error('[mypage] Failed to load profile summary for hub', profileError);
        }

        return {
                        session,
                        profile: profile ?? null,
                        invitesEnabled: INVITES_ENABLED,
                        profileLoadError: profileError ? '프로필 요약을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.' : null
        };
};
