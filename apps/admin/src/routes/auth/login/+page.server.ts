import { fail, redirect, error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
  ADMIN_ONLY_MESSAGE,
  buildAuthCallbackUrl,
  getSafeNextPath,
  isLocalDevAuthEnabled,
  normalizeEmail
} from '$lib/server/auth';
import { getSupabaseAdminClient } from '$lib/server/supabase';

const getErrorMessage = (code: string | null) => {
  switch (code) {
    case 'not-admin':
      return ADMIN_ONLY_MESSAGE;
    case 'callback':
      return '로그인 확인 중 오류가 발생했습니다. 다시 시도해주세요.';
    case 'session':
      return '세션을 확인하지 못했습니다. 다시 로그인해주세요.';
    default:
      return null;
  }
};

const ensureAdminSession = async (locals: App.Locals, userId: string) => {
  const { data: profile } = await locals.supabase
    .from('profiles')
    .select('is_admin')
    .eq('user_id', userId)
    .maybeSingle();

  return Boolean(profile?.is_admin);
};

export const load: PageServerLoad = async ({ locals, url }) => {
  const nextPath = getSafeNextPath(url.searchParams.get('next'));
  const session = await locals.getSession();

  if (session) {
    const isAdmin = await ensureAdminSession(locals, session.user.id);

    if (isAdmin) {
      throw redirect(303, nextPath);
    }

    await locals.supabase.auth.signOut();
    throw redirect(303, '/auth/login?error=not-admin');
  }

  const devAuthEnabled = isLocalDevAuthEnabled(url);
  const devAdminCandidates = devAuthEnabled
    ? (
        await locals.supabase
          .from('profiles')
          .select('full_name, email')
          .eq('is_admin', true)
          .not('email', 'is', null)
          .order('full_name', { ascending: true })
          .limit(8)
      ).data ?? []
    : [];

  return {
    nextPath,
    errorMessage: getErrorMessage(url.searchParams.get('error')),
    devAuthEnabled,
    devAdminCandidates
  };
};

export const actions: Actions = {
  password: async ({ request, locals }) => {
    const formData = await request.formData();
    const email = normalizeEmail(formData.get('email'));
    const password = formData.get('password')?.toString().trim() ?? '';
    const nextPath = getSafeNextPath(formData.get('next')?.toString());

    if (!email || !password) {
      return fail(400, {
        mode: 'password',
        message: '이메일과 비밀번호를 입력해주세요.',
        passwordEmail: email,
        nextPath
      });
    }

    const { data, error: signInError } = await locals.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError || !data.user) {
      return fail(400, {
        mode: 'password',
        message: '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.',
        passwordEmail: email,
        nextPath
      });
    }

    const isAdmin = await ensureAdminSession(locals, data.user.id);

    if (!isAdmin) {
      await locals.supabase.auth.signOut();

      return fail(403, {
        mode: 'password',
        message: ADMIN_ONLY_MESSAGE,
        passwordEmail: email,
        nextPath
      });
    }

    throw redirect(303, nextPath);
  },

  google: async ({ request, locals, url }) => {
    const formData = await request.formData();
    const nextPath = getSafeNextPath(formData.get('next')?.toString());

    const { data, error: signInError } = await locals.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: buildAuthCallbackUrl(url, nextPath)
      }
    });

    if (signInError || !data?.url) {
      return fail(500, {
        mode: 'google',
        message: 'Google 로그인을 시작하지 못했습니다.',
        nextPath
      });
    }

    throw redirect(303, data.url);
  },

  devMagicLink: async ({ request, locals, url }) => {
    if (!isLocalDevAuthEnabled(url)) {
      throw error(404, 'Not found');
    }

    const formData = await request.formData();
    const email = normalizeEmail(formData.get('email'));
    const nextPath = getSafeNextPath(formData.get('next')?.toString());

    if (!email) {
      return fail(400, {
        mode: 'devMagicLink',
        message: '빠른 로그인에 사용할 관리자 이메일을 선택해주세요.',
        nextPath
      });
    }

    const adminClient = getSupabaseAdminClient();

    if (!adminClient) {
      return fail(500, {
        mode: 'devMagicLink',
        message: 'SUPABASE_SERVICE_ROLE_KEY가 없어 빠른 로그인을 사용할 수 없습니다.',
        nextPath
      });
    }

    const { data: adminProfile } = await locals.supabase
      .from('profiles')
      .select('email')
      .ilike('email', email)
      .eq('is_admin', true)
      .maybeSingle();

    if (!adminProfile?.email) {
      return fail(403, {
        mode: 'devMagicLink',
        message: '관리자 이메일로만 로컬 빠른 로그인을 사용할 수 있습니다.',
        nextPath
      });
    }

    const { data, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: adminProfile.email,
      options: {
        redirectTo: buildAuthCallbackUrl(url, nextPath)
      }
    });

    if (linkError || !data.properties?.action_link) {
      console.error('Failed to generate admin dev magic link', linkError);

      return fail(500, {
        mode: 'devMagicLink',
        message: '빠른 로그인 링크를 생성하지 못했습니다.',
        nextPath
      });
    }

    throw redirect(303, data.properties.action_link);
  }
};
