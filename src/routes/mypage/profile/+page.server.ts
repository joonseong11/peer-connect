import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const buildClaimStatusMessage = (status: string | null) => {
  if (status === 'claimed') {
    return '추천서가 내 계정에 연결되었고 서비스 이용이 활성화되었습니다.';
  }

  if (status === 'already-linked') {
    return '이미 같은 추천이 연결되어 있어 기존 추천서를 그대로 유지했습니다.';
  }

  return null;
};

export const load: PageServerLoad = async ({ locals, url }) => {
  const session = await locals.getSession();

  if (!session) {
    throw redirect(303, '/?authError=signin-required');
  }

  const userId = session.user.id;

  const { data: profile, error: profileError } = await locals.supabase
    .from('profiles')
    .select(
      'user_id, full_name, role, career_history, introduction, contact_linkedin, contact_github, contact_email, contact_blog, updated_at, photo_url'
    )
    .eq('user_id', userId)
    .maybeSingle();

  const { data: endorsements, error: endorsementsError } = await locals.supabase
    .from('endorsements')
    .select(
      'id, content, created_at, author_id, author:profiles!endorsements_author_id_fkey(user_id, full_name, role, photo_url)'
    )
    .eq('target_user_id', userId)
    .order('created_at', { ascending: false });

  if (profileError) {
    console.error('[mypage] Failed to load profile for self view', profileError);
  }

  if (endorsementsError) {
    console.error('[mypage] Failed to load endorsements for self view', endorsementsError);
  }

  return {
    session,
    profile: profile ?? null,
    endorsements: endorsements ?? [],
    claimStatusMessage: buildClaimStatusMessage(url.searchParams.get('claimStatus')),
    loadError: profileError
      ? '프로필 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
      : endorsementsError
        ? '추천서를 모두 불러오지 못했습니다. 새로고침 후 다시 확인해주세요.'
        : null
  };
};
