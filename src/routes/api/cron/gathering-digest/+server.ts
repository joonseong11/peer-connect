import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { notifyGatheringDigest } from '$lib/server/notifications';
import { hasProfileEmailColumn } from '$lib/server/profileEmailColumn';
import { getSupabaseAdminClient } from '$lib/server/supabaseAdmin';

/**
 * Daily Gathering Digest Cron Endpoint
 *
 * This endpoint should be called daily (e.g., at 7:00 AM) to send a digest email
 * of all new gathering posts that haven't been sent yet.
 *
 * Setup instructions:
 * 1. Use a cron service (GitHub Actions, Vercel Cron, or external service)
 * 2. Make a GET or POST request to this endpoint daily at 7:00 AM KST
 * 3. Optional: Add authentication token for security
 *
 * Example with curl:
 * curl -X POST https://your-domain.com/api/cron/gathering-digest
 */

export const GET: RequestHandler = async ({ locals }) => {
  return handleDigest(locals);
};

export const POST: RequestHandler = async ({ locals }) => {
  return handleDigest(locals);
};

async function handleDigest(locals: App.Locals) {
  try {
    const adminClient = getSupabaseAdminClient();

    if (!adminClient) {
      console.error('[gathering-digest] SUPABASE_SERVICE_ROLE_KEY is not configured');
      return json(
        { success: false, error: 'Admin client not configured' },
        { status: 500 }
      );
    }

    const emailColumnAvailable = await hasProfileEmailColumn(adminClient);

    if (!emailColumnAvailable) {
      console.warn('[gathering-digest] profiles.email column is unavailable');
      return json(
        { success: false, error: 'Email column not available' },
        { status: 500 }
      );
    }

    // Get all gatherings that haven't been sent yet
    const { data: pendingPosts, error: postsError } = await adminClient
      .from('gatherings')
      .select('id, title, content, created_at, author_id, author:profiles(full_name)')
      .eq('email_sent', false)
      .order('created_at', { ascending: true });

    if (postsError) {
      console.error('[gathering-digest] Failed to load pending posts', postsError);
      return json(
        { success: false, error: 'Failed to load pending posts' },
        { status: 500 }
      );
    }

    // If no pending posts, return early
    if (!pendingPosts || pendingPosts.length === 0) {
      console.log('[gathering-digest] No pending posts to send');
      return json({
        success: true,
        message: 'No pending posts',
        sent: 0
      });
    }

    // Get all recipients who want gathering notifications
    const { data: recipients, error: recipientsError } = await adminClient
      .from('profiles')
      .select('user_id, email, full_name, notify_gatherings')
      .not('email', 'is', null);

    if (recipientsError) {
      console.error('[gathering-digest] Failed to load recipients', recipientsError);
      return json(
        { success: false, error: 'Failed to load recipients' },
        { status: 500 }
      );
    }

    // Filter recipients who want notifications and aren't authors of any of the posts
    const authorIds = new Set(pendingPosts.map((post) => post.author_id));
    const filteredRecipients =
      recipients
        ?.filter(
          (recipient) =>
            recipient.email &&
            recipient.email.length > 0 &&
            !authorIds.has(recipient.user_id) &&
            recipient.notify_gatherings !== false
        )
        .map((recipient) => ({
          email: recipient.email as string,
          name: recipient.full_name ?? null
        })) ?? [];

    if (filteredRecipients.length === 0) {
      console.log('[gathering-digest] No recipients to notify');

      // Still mark posts as sent even if no recipients
      const postIds = pendingPosts.map((post) => post.id);
      await adminClient
        .from('gatherings')
        .update({ email_sent: true })
        .in('id', postIds);

      return json({
        success: true,
        message: 'No recipients to notify',
        posts: pendingPosts.length,
        sent: 0
      });
    }

    // Prepare posts data for email
    const postsForEmail = pendingPosts.map((post) => ({
      id: post.id,
      title: post.title,
      content: post.content,
      created_at: post.created_at,
      authorName: (post.author as any)?.full_name ?? '알 수 없는 멤버'
    }));

    // Send digest email
    const emailResult = await notifyGatheringDigest({
      recipients: filteredRecipients,
      posts: postsForEmail
    });

    if (!emailResult.ok) {
      console.error('[gathering-digest] Failed to send digest email', emailResult);
      return json(
        { success: false, error: 'Failed to send digest email' },
        { status: 500 }
      );
    }

    // Mark all posts as sent
    const postIds = pendingPosts.map((post) => post.id);
    const { error: updateError } = await adminClient
      .from('gatherings')
      .update({ email_sent: true })
      .in('id', postIds);

    if (updateError) {
      console.error('[gathering-digest] Failed to mark posts as sent', updateError);
      return json(
        { success: false, error: 'Failed to mark posts as sent' },
        { status: 500 }
      );
    }

    console.log(
      `[gathering-digest] Successfully sent digest with ${pendingPosts.length} posts to ${filteredRecipients.length} recipients`
    );

    return json({
      success: true,
      message: 'Digest sent successfully',
      posts: pendingPosts.length,
      recipients: filteredRecipients.length
    });
  } catch (error) {
    console.error('[gathering-digest] Unexpected error', error);
    return json(
      { success: false, error: 'Unexpected error occurred' },
      { status: 500 }
    );
  }
}
