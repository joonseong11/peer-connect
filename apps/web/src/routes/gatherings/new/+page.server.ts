import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const TITLE_MIN_LENGTH = 5;
const CONTENT_MIN_LENGTH = 20;

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.getSession();

  if (!session) {
    throw redirect(303, '/?authError=signin-required');
  }

  return {
    session
  };
};

type CreateActionState = {
  success: boolean;
  errors?: Partial<Record<'title' | 'content', string>>;
  serverMessage?: string;
  values?: {
    title: string;
    content: string;
  };
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
    const session = await locals.getSession();

    if (!session) {
      throw redirect(303, '/?authError=signin-required');
    }

    const formData = await request.formData();
    const title = (formData.get('title') ?? '').toString().trim();
    const content = (formData.get('content') ?? '').toString().trim();

    const errors: NonNullable<CreateActionState['errors']> = {};

    if (title.length < TITLE_MIN_LENGTH) {
      errors.title = `제목은 최소 ${TITLE_MIN_LENGTH}자 이상 입력해주세요.`;
    }

    if (content.length < CONTENT_MIN_LENGTH) {
      errors.content = `내용은 최소 ${CONTENT_MIN_LENGTH}자 이상 입력해주세요.`;
    }

    if (Object.keys(errors).length > 0) {
      return fail(400, {
        success: false,
        errors,
        values: { title, content }
      });
    }

    // Insert gathering post with email_sent = false for daily digest
    const { data: inserted, error: insertError } = await locals.supabase
      .from('gatherings')
      .insert({
        title,
        content,
        author_id: session.user.id,
        email_sent: false
      })
      .select('id')
      .single();

    if (insertError || !inserted) {
      console.error('Failed to create gathering post', insertError);
      return fail(500, {
        success: false,
        serverMessage: '모임 게시글을 등록하지 못했습니다. 잠시 후 다시 시도해주세요.',
        values: { title, content }
      });
    }

    // Redirect to the newly created post
    throw redirect(303, `/gatherings/${inserted.id}`);
  }
};
