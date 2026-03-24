import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { getSupabaseAdminClient } from '$lib/server/supabase';

export const load: PageServerLoad = async ({ locals, url }) => {
  const page = Number(url.searchParams.get('page') ?? '1');
  const perPage = 20;
  const offset = (page - 1) * perPage;

  const { data: members, count } = await locals.supabase
    .from('profiles')
    .select('user_id, full_name, role, email, is_admin, profile_completed_at, updated_at', {
      count: 'exact'
    })
    .order('updated_at', { ascending: false })
    .range(offset, offset + perPage - 1);

  return {
    members: members ?? [],
    totalCount: count ?? 0,
    page,
    perPage
  };
};

export const actions: Actions = {
  toggleAdmin: async ({ request, locals }) => {
    const formData = await request.formData();
    const userId = formData.get('userId') as string;
    const currentValue = formData.get('isAdmin') === 'true';

    if (!userId) return fail(400, { message: 'userId is required' });

    const adminClient = getSupabaseAdminClient();

    if (!adminClient) {
      return fail(500, { message: 'SUPABASE_SERVICE_ROLE_KEY is required' });
    }

    const { error } = await adminClient
      .from('profiles')
      .update({ is_admin: !currentValue })
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to toggle admin', error);
      return fail(500, { message: 'Failed to update' });
    }

    return { success: true };
  }
};
