import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { hasProfileEmailColumn } from '$lib/server/profileEmailColumn';
import { notifyEndorsementReceived } from '$lib/server/notifications';
import { getSupabaseAdminClient } from '$lib/server/supabaseAdmin';

export const load: PageServerLoad = async ({ locals, params, url }) => {
  const session = await locals.getSession();

  // Public access allowed for reading profile
  // if (!session) {
  //   throw redirect(303, '/?authError=signin-required');
  // }

  const targetUserId = params.userId;

  const { data: profile, error: profileError } = await locals.supabase
    .from('profiles')
    .select(
      'user_id, full_name, role, career_history, introduction, contact_linkedin, contact_github, contact_email, updated_at, photo_url'
    )
    .eq('user_id', targetUserId)
    .maybeSingle();

  if (profileError) {
    console.error('Failed to load member profile', profileError);
    return {
      session,
      profile: null,
      endorsements: [],
      existingEndorsementId: null,
      statusMessage: null,
      loadError: '프로필을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
    };
  }

  if (!profile) {
    throw redirect(303, '/members');
  }

  const { data: endorsements, error: endorsementsError } = await locals.supabase
    .from('endorsements')
    .select(
      'id, content, created_at, author_id, author:profiles!endorsements_author_id_fkey(user_id, full_name, role, photo_url)'
    )
    .eq('target_user_id', targetUserId)
    .order('created_at', { ascending: false });

  if (endorsementsError) {
    console.error('Failed to load endorsements', endorsementsError);
  }

  let existingEndorsement: { id: string } | null = null;
  
  if (session) {
    const { data } = await locals.supabase
      .from('endorsements')
      .select('id')
      .eq('target_user_id', targetUserId)
      .eq('author_id', session.user.id)
      .maybeSingle();
      
    existingEndorsement = data;
  }

  const statusParam = url.searchParams.get('endorsementStatus');
  let statusMessage: string | null = null;

  if (statusParam === 'created') {
    statusMessage = '추천이 등록되었습니다.';
  } else if (statusParam === 'deleted') {
    statusMessage = '추천을 삭제했습니다.';
  } else if (statusParam === 'prompt') {
    statusMessage = '나를 초대한 동료에게 첫 추천을 남겨보세요!';
  }

  return {
    session,
    profile,
    endorsements: endorsements ?? [],
    existingEndorsementId: existingEndorsement?.id ?? null,
    statusMessage,
    loadError: endorsementsError ? '동료 추천 정보를 모두 불러오지 못했습니다.' : null
  };
};

export const actions: Actions = {
  endorse: async ({ request, locals, params }) => {
    const session = await locals.getSession();

    if (!session) {
      throw redirect(303, '/?authError=signin-required');
    }

    const targetUserId = params.userId;
    const formData = await request.formData();
    const content = (formData.get('content') ?? '').toString().trim();

    if (content.length < 20) {
      return fail(400, {
        success: false,
        errors: { content: '추천/칭찬은 최소 20자 이상 작성해주세요.' },
        values: { content }
      });
    }

    if (session.user.id === targetUserId) {
      return fail(400, {
        success: false,
        errors: { content: '본인 프로필에는 추천서를 남길 수 없습니다.' },
        values: { content }
      });
    }

    const { data: existing } = await locals.supabase
      .from('endorsements')
      .select('id')
      .eq('target_user_id', targetUserId)
      .eq('author_id', session.user.id)
      .maybeSingle();

    if (existing) {
      return fail(400, {
        success: false,
        errors: {
          content: '이미 이 동료에게 작성한 추천이 있습니다. 삭제 후 다시 작성할 수 있어요.'
        },
        values: { content }
      });
    }

    const { error } = await locals.supabase.from('endorsements').insert({
      target_user_id: targetUserId,
      author_id: session.user.id,
      content
    });

    if (error) {
      console.error('Failed to create endorsement', error);
      return fail(500, {
        success: false,
        serverMessage: '추천을 저장하는 중 문제가 발생했습니다.',
        values: { content }
      });
    }

    const emailColumnAvailable = await hasProfileEmailColumn(locals.supabase);

    let targetProfile: { user_id: string; full_name: string | null; email?: string | null } | null =
      null;

    if (emailColumnAvailable) {
      const adminClient = getSupabaseAdminClient();

      if (!adminClient) {
        console.warn(
          '[endorsements] SUPABASE_SERVICE_ROLE_KEY is not configured; cannot load target email.'
        );
      } else {
        const { data, error } = await adminClient
          .from('profiles')
          .select('user_id, full_name, email')
          .eq('user_id', targetUserId)
          .maybeSingle();

        if (error) {
          console.error('Failed to load target profile for endorsement notification', error);
        } else {
          targetProfile = data;
        }
      }
    }

    if (!targetProfile) {
      if (emailColumnAvailable) {
        const { data, error: fallbackError } = await locals.supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .eq('user_id', targetUserId)
          .maybeSingle();
        if (fallbackError) {
          console.error(
            'Failed to load target profile fallback for endorsement notification',
            fallbackError
          );
        } else {
          targetProfile = data;
        }
      } else {
        const { data, error: fallbackError } = await locals.supabase
          .from('profiles')
          .select('user_id, full_name')
          .eq('user_id', targetUserId)
          .maybeSingle();
        if (fallbackError) {
          console.error(
            'Failed to load target profile fallback for endorsement notification',
            fallbackError
          );
        } else {
          targetProfile = data;
        }
      }
    }

    const { data: authorProfile } = await locals.supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (emailColumnAvailable) {
      if (targetProfile?.email) {
        await notifyEndorsementReceived({
          target: {
            email: targetProfile.email,
            name: targetProfile.full_name ?? null,
            userId: targetUserId
          },
          authorName:
            authorProfile?.full_name ?? session.user.user_metadata.full_name ?? '알 수 없는 동료',
          content
        });
      } else {
        console.warn(
          `[endorsements] Target profile ${targetUserId} has no email; skipping endorsement notification.`
        );
      }
    } else {
      console.warn(
        '[endorsements] Skipping endorsement notification because profiles.email column is unavailable.'
      );
    }

    throw redirect(303, `/members/${targetUserId}?endorsementStatus=created`);
  },
  delete: async ({ request, locals, params }) => {
    const session = await locals.getSession();

    if (!session) {
      throw redirect(303, '/?authError=signin-required');
    }

    const targetUserId = params.userId;
    const formData = await request.formData();
    const endorsementId = formData.get('endorsementId');

    if (!endorsementId || typeof endorsementId !== 'string') {
      return fail(400, {
        deleteError: '삭제할 추천을 찾을 수 없습니다.'
      });
    }

    const { error } = await locals.supabase
      .from('endorsements')
      .delete()
      .eq('id', endorsementId)
      .eq('author_id', session.user.id);

    if (error) {
      console.error('Failed to delete endorsement', error);
      return fail(500, {
        deleteError: '추천을 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.'
      });
    }

    throw redirect(303, `/members/${targetUserId}?endorsementStatus=deleted`);
  }
};
