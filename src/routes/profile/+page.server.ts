import { fail, redirect } from '@sveltejs/kit';
import type { PostgrestError } from '@supabase/supabase-js';
import type { Actions, PageServerLoad } from './$types';
import { hasProfileEmailColumn } from '$lib/server/profileEmailColumn';
import { normalizeEmail } from '$lib/utils/normalizeEmail';

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
type ProfileErrors = Partial<Record<ProfileField, string>>;

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.getSession();

  if (!session) {
    throw redirect(303, '/?authError=signin-required');
  }

  const emailColumnAvailable = await hasProfileEmailColumn(locals.supabase);

  const baseColumns =
    'full_name, role, career_history, introduction, contact_linkedin, contact_github, contact_email, updated_at';
  const selectColumns = emailColumnAvailable ? `${baseColumns}, email` : baseColumns;

  const { data: profile, error } = await locals.supabase
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

    const { data: currentProfile, error: currentProfileError } = await locals.supabase
      .from('profiles')
      .select('id, profile_completed_at')
      .eq('user_id', session.user.id)
      .maybeSingle();

    const formData = await request.formData();
    const values = PROFILE_FIELDS.reduce<Record<ProfileField, string>>(
      (acc, key) => {
        const value = (formData.get(key) ?? '').toString().trim();
        acc[key] = value;
        return acc;
      },
      {} as Record<ProfileField, string>
    );

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

    if (values.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.contact_email)) {
      errors.contact_email = '유효한 이메일 주소를 입력해주세요.';
    }

    if (!values.full_name) {
      errors.full_name = '이름을 입력해주세요.';
    }

    if (Object.keys(errors).length > 0) {
      return fail(400, {
        success: false,
        errors,
        values
      });
    }

    const payload: Record<string, unknown> = {
      full_name: values.full_name,
      role: values.role || null,
      career_history: values.career_history,
      introduction: values.introduction,
      contact_linkedin: values.contact_linkedin || null,
      contact_github: values.contact_github || null,
      contact_email: values.contact_email || null,
      updated_at: new Date().toISOString()
    };

    // Sync full_name to Auth User Metadata
    const { error: updateUserError } = await locals.supabase.auth.updateUser({
      data: { full_name: values.full_name }
    });

    if (updateUserError) {
      console.error('Failed to update auth user metadata', updateUserError);
      // Note: We continue even if this fails, as the profile update is the primary goal.
    }

    if (currentProfileError) {
      console.error('Failed to load current profile state before save', currentProfileError);
    }

    const shouldSetCompletion = currentProfile ? !currentProfile.profile_completed_at : true;

    const insertPayload: Record<string, unknown> = {
      ...payload,
      user_id: session.user.id
    };

    if (shouldSetCompletion) {
      payload.profile_completed_at = new Date().toISOString();
      insertPayload.profile_completed_at = payload.profile_completed_at;
    }

    if (emailColumnAvailable) {
      const normalizedEmail = normalizeEmail(session.user.email ?? null);
      payload.email = normalizedEmail;
      insertPayload.email = normalizedEmail;
    }

    let error: PostgrestError | null = null;
    let firstCompletion = shouldSetCompletion;

    const { data: updatedProfile, error: updateError } = await locals.supabase
      .from('profiles')
      .update(payload)
      .eq('user_id', session.user.id)
      .select('profile_completed_at')
      .maybeSingle();

    if (updateError?.code === 'PGRST116') {
      const { data: insertedProfile, error: insertError } = await locals.supabase
        .from('profiles')
        .insert(insertPayload)
        .select('profile_completed_at')
        .single();

      error = insertError;
      firstCompletion = shouldSetCompletion && Boolean(insertedProfile?.profile_completed_at);
    } else {
      error = updateError;
      firstCompletion = shouldSetCompletion && Boolean(updatedProfile?.profile_completed_at);
    }

    if (error) {
      console.error('Failed to save profile', error);
      return fail(500, {
        success: false,
        serverMessage: '프로필 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        values
      });
    }

    return {
      success: true,
      firstCompletion,
      values
    };
  }
};
