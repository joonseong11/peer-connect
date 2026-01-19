import { getSupabaseAdminClient } from '$lib/server/supabaseAdmin';
import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Special slot index for invites generated via GitHub Badge clicks
// This ensures they don't conflict with regular user invite slots (1, 2, etc.)
const BADGE_INVITE_SLOT_INDEX = 999;

export const GET: RequestHandler = async ({ params, url }) => {
  const userId = params.userId;
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw error(500, 'Server configuration error');
  }

  // 1. Check if a Badge Invite already exists for this user
  const { data: existingInvite } = await supabase
    .from('invites')
    .select('code')
    .eq('inviter_user_id', userId)
    .eq('slot_index', BADGE_INVITE_SLOT_INDEX)
    .maybeSingle();

  if (existingInvite) {
    throw redirect(303, `/invite?code=${existingInvite.code}`);
  }

  // 2. If not, verify the user exists first (optimization to avoid creating invites for invalid IDs)
  // Actually, foreign key constraint would fail if user doesn't exist, but checking first is cleaner.
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!profile) {
    throw error(404, 'User not found');
  }

  // 3. Create a new "Unlimited" Badge Invite
  const code = crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase();

  const { error: insertError } = await supabase.from('invites').insert({
    code,
    inviter_user_id: userId,
    slot_index: BADGE_INVITE_SLOT_INDEX,
    max_redemptions: null, // Unlimited
    beta_unlimited: true   // Explicitly mark as unlimited
  });

  if (insertError) {
    console.error('Failed to create badge invite', insertError);
    throw error(500, 'Failed to generate invite link');
  }

  // 4. Redirect to the invite page with the new code
  throw redirect(303, `/invite?code=${code}`);
};
