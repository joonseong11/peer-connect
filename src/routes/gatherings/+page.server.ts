import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.getSession();

  if (!session) {
    throw redirect(303, '/?authError=signin-required');
  }

  const { data: posts, error } = await locals.supabase
    .from('gatherings')
    .select(
      'id, title, content, created_at, updated_at, author_id, author:profiles(full_name, role, photo_url)'
    )
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load gatherings', error);
    return {
      session,
      posts: [],
      loadError: '모임 게시글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
    };
  }

  return {
    session,
    posts: posts ?? [],
    loadError: null
  };
};
