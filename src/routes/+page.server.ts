import { fail, redirect } from '@sveltejs/kit';
import { INVITES_ENABLED } from '$lib/config';
import type { Actions, PageServerLoad } from './$types';

type HomeProfileRow = {
  full_name: string | null;
  role: string | null;
  introduction: string | null;
  career_history: string | null;
  contact_linkedin: string | null;
  contact_github: string | null;
  contact_email: string | null;
  photo_url: string | null;
  profile_completed_at: string | null;
  updated_at: string | null;
};

type HomeMemberRow = {
  user_id: string;
  full_name: string;
  role: string | null;
  introduction: string | null;
  updated_at: string | null;
  photo_url: string | null;
};

type HomeGatheringRow = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string | null;
  author_id: string;
  author?: {
    full_name: string | null;
    role: string | null;
    photo_url: string | null;
  } | null;
};

type HomeGatheringQueryRow = Omit<HomeGatheringRow, 'author'> & {
  author?: HomeGatheringRow['author'] | HomeGatheringRow['author'][];
};

const buildProfileCompletion = (profile: HomeProfileRow | null) => {
  if (!profile) {
    return 0;
  }

  if (profile.profile_completed_at) {
    return 100;
  }

  const fields = [profile.full_name, profile.role, profile.introduction];

  const completed = fields.filter((value) => Boolean(value && value.trim().length > 0)).length;
  return Math.round((completed / fields.length) * 100);
};

const buildNextAction = (input: {
  profileCompletion: number;
  inviterUserId: string | null;
  hasEndorsedInviter: boolean;
  inviteePrompt: {
    inviteeUserId: string;
    inviteeName: string | null;
  } | null;
  invitesEnabled: boolean;
}) => {
  if (input.profileCompletion < 100) {
    return {
      title: '프로필을 더 완성해보세요',
      description: '기본 정보와 소개를 마무리하면 다른 사람이 나를 더 쉽게 이해할 수 있습니다.',
      href: '/profile',
      ctaLabel: '프로필 보완하기'
    };
  }

  if (input.inviterUserId && !input.hasEndorsedInviter) {
    return {
      title: '나를 초대한 동료에게 추천서를 남겨보세요',
      description:
        'Peer Connect에 합류하게 된 첫 연결부터 기록해두면 이후의 관계도 더 단단해집니다.',
      href: `/members/${input.inviterUserId}?endorsementStatus=prompt`,
      ctaLabel: '추천서 작성하기'
    };
  }

  if (input.inviteePrompt) {
    return {
      title: `${input.inviteePrompt.inviteeName ?? '새 동료'}님에게 첫 추천을 남겨보세요`,
      description: '내 초대로 합류한 동료에게 첫 추천을 남기면 네트워크의 첫 인상도 더 좋아집니다.',
      href: `/members/${input.inviteePrompt.inviteeUserId}?endorsementStatus=prompt`,
      ctaLabel: '추천서 작성하기'
    };
  }

  if (input.invitesEnabled) {
    return {
      title: '신뢰하는 동료를 초대해보세요',
      description: '좋은 네트워크는 결국 좋은 사람을 초대하는 데서 시작됩니다.',
      href: '/invite',
      ctaLabel: '초대 관리하기'
    };
  }

  return null;
};

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.getSession();

  if (!session) {
    return {
      inviteePrompt: null,
      homeData: null
    };
  }

  const [
    invitePromptResult,
    inviteLinkResult,
    profileResult,
    memberResult,
    gatheringResult,
    myEndorsementCountResult
  ] = await Promise.all([
    locals.supabase
      .from('invite_redemptions')
      .select(
        'id, invitee_user_id, redeemed_at, inviter_notified_at, invitee:profiles!invite_redemptions_invitee_user_id_fkey(full_name, role), invite:invites!inner(inviter_user_id)'
      )
      .eq('invite.inviter_user_id', session.user.id)
      .not('invitee_user_id', 'is', null)
      .is('inviter_notified_at', null)
      .order('redeemed_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    locals.supabase
      .from('invite_redemptions')
      .select('invite:invites!inner(inviter_user_id)')
      .eq('invitee_user_id', session.user.id)
      .order('redeemed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    locals.supabase
      .from('profiles')
      .select(
        'full_name, role, introduction, career_history, contact_linkedin, contact_github, contact_email, photo_url, profile_completed_at, updated_at'
      )
      .eq('user_id', session.user.id)
      .maybeSingle(),
    locals.supabase
      .from('profiles')
      .select('user_id, full_name, role, introduction, updated_at, photo_url')
      .neq('user_id', session.user.id)
      .not('profile_completed_at', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(3),
    locals.supabase
      .from('gatherings')
      .select(
        'id, title, content, created_at, updated_at, author_id, author:profiles(full_name, role, photo_url)'
      )
      .order('created_at', { ascending: false })
      .limit(3),
    locals.supabase
      .from('endorsements')
      .select('id', { count: 'exact', head: true })
      .eq('target_user_id', session.user.id)
  ]);

  if (invitePromptResult.error) {
    console.error('Failed to load pending invite notifications', invitePromptResult.error);
  }

  if (profileResult.error) {
    console.error('Failed to load profile summary for home', profileResult.error);
  }

  if (inviteLinkResult.error) {
    console.error('Failed to load inviter link for home', inviteLinkResult.error);
  }

  if (memberResult.error) {
    console.error('Failed to load recent members for home', memberResult.error);
  }

  if (gatheringResult.error) {
    console.error('Failed to load recent gatherings for home', gatheringResult.error);
  }

  if (myEndorsementCountResult.error) {
    console.error('Failed to load endorsement count for home', myEndorsementCountResult.error);
  }

  const promptData = invitePromptResult.data;
  const inviteRow = promptData
    ? Array.isArray(promptData.invite)
      ? promptData.invite[0]
      : promptData.invite
    : null;
  const inviteeProfile = promptData
    ? Array.isArray(promptData.invitee)
      ? promptData.invitee[0]
      : promptData.invitee
    : null;

  const inviteePrompt =
    inviteRow && inviteRow.inviter_user_id === session.user.id && promptData?.invitee_user_id
      ? {
          redemptionId: String(promptData.id),
          inviteeUserId: String(promptData.invitee_user_id),
          inviteeName:
            typeof inviteeProfile?.full_name === 'string' ? inviteeProfile.full_name : null,
          inviteeRole: typeof inviteeProfile?.role === 'string' ? inviteeProfile.role : null
        }
      : null;

  const profile = (profileResult.data as HomeProfileRow | null) ?? null;
  const inviteLinkRow = inviteLinkResult.data
    ? Array.isArray(inviteLinkResult.data.invite)
      ? inviteLinkResult.data.invite[0]
      : inviteLinkResult.data.invite
    : null;
  const inviterUserId =
    inviteLinkRow && typeof inviteLinkRow.inviter_user_id === 'string'
      ? inviteLinkRow.inviter_user_id
      : null;

  let hasEndorsedInviter = false;

  if (inviterUserId) {
    const { data: inviterEndorsement, error: inviterEndorsementError } = await locals.supabase
      .from('endorsements')
      .select('id')
      .eq('author_id', session.user.id)
      .eq('target_user_id', inviterUserId)
      .maybeSingle();

    if (inviterEndorsementError) {
      console.error('Failed to load endorsement status for inviter', inviterEndorsementError);
    } else {
      hasEndorsedInviter = Boolean(inviterEndorsement?.id);
    }
  }

  const recentMembers = ((memberResult.data as HomeMemberRow[] | null) ?? []).map((member) => ({
    ...member,
    role: member.role ?? '직군 정보 없음',
    introduction: member.introduction ?? '',
    photo_url: member.photo_url ?? null
  }));

  const memberIds = recentMembers.map((member) => member.user_id);
  const endorsementCounts = new Map<string, number>();

  if (memberIds.length > 0) {
    const { data: memberEndorsements, error: memberEndorsementsError } = await locals.supabase
      .from('endorsements')
      .select('target_user_id')
      .in('target_user_id', memberIds);

    if (memberEndorsementsError) {
      console.error('Failed to load member endorsement counts for home', memberEndorsementsError);
    } else {
      for (const row of memberEndorsements ?? []) {
        const current = endorsementCounts.get(row.target_user_id) ?? 0;
        endorsementCounts.set(row.target_user_id, current + 1);
      }
    }
  }

  const recentGatherings = (
    ((gatheringResult.data ?? []) as unknown as HomeGatheringQueryRow[]) ?? []
  ).map((post) => ({
    ...post,
    summary: post.content.length > 120 ? `${post.content.slice(0, 120).trim()}...` : post.content,
    author: Array.isArray(post.author) ? post.author[0] : post.author
  }));

  const profileCompletion = buildProfileCompletion(profile);
  const endorsementCount = myEndorsementCountResult.count ?? 0;

  return {
    inviteePrompt,
    homeData: {
      profile: {
        full_name: profile?.full_name ?? session.user.user_metadata.full_name ?? '멤버',
        role: profile?.role ?? session.user.user_metadata.title ?? '프로필을 보완해보세요',
        photo_url: profile?.photo_url ?? null,
        updated_at: profile?.updated_at ?? null
      },
      summary: {
        profileCompletion,
        endorsementCount,
        recentGatheringCount: recentGatherings.length
      },
      nextAction: buildNextAction({
        profileCompletion,
        inviterUserId,
        hasEndorsedInviter,
        inviteePrompt: inviteePrompt
          ? {
              inviteeUserId: inviteePrompt.inviteeUserId,
              inviteeName: inviteePrompt.inviteeName
            }
          : null,
        invitesEnabled: INVITES_ENABLED
      }),
      recentMembers: recentMembers.map((member) => ({
        ...member,
        endorsementCount: endorsementCounts.get(member.user_id) ?? 0
      })),
      recentGatherings,
      homeError:
        profileResult.error || memberResult.error || gatheringResult.error
          ? '일부 홈 데이터를 불러오지 못했습니다. 잠시 후 다시 확인해주세요.'
          : null
    }
  };
};

export const actions: Actions = {
  acknowledgeInviteePrompt: async ({ request, locals }) => {
    const session = await locals.getSession();

    if (!session) {
      throw redirect(303, '/?authError=signin-required');
    }

    const formData = await request.formData();
    const redemptionId = (formData.get('redemptionId') ?? '').toString().trim();
    const intent = (formData.get('intent') ?? '').toString().trim();
    const next = (formData.get('next') ?? '').toString().trim();

    if (!redemptionId) {
      return fail(400, {
        ackError: '알림을 처리할 초대 정보를 찾지 못했습니다.'
      });
    }

    const { data, error } = await locals.supabase
      .from('invite_redemptions')
      .select('id, invite:invites!inner(inviter_user_id)')
      .eq('id', redemptionId)
      .maybeSingle();

    const inviteRow = data ? (Array.isArray(data.invite) ? data.invite[0] : data.invite) : null;

    if (error || !inviteRow || inviteRow.inviter_user_id !== session.user.id) {
      return fail(403, {
        ackError: '이 초대 알림을 확인할 권한이 없습니다.'
      });
    }

    const { error: updateError } = await locals.supabase
      .from('invite_redemptions')
      .update({ inviter_notified_at: new Date().toISOString() })
      .eq('id', redemptionId);

    if (updateError) {
      console.error('Failed to acknowledge invite redemption prompt', updateError);
      return fail(500, {
        ackError: '알림을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.'
      });
    }

    if (intent === 'visit' && next.startsWith('/')) {
      throw redirect(303, next);
    }

    return {
      success: true
    };
  }
};
