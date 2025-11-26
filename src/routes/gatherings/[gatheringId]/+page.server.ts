import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { hasProfileEmailColumn } from '$lib/server/profileEmailColumn';
import { notifyGatheringCommentReceived } from '$lib/server/notifications';
import { getSupabaseAdminClient } from '$lib/server/supabaseAdmin';

const TITLE_MIN_LENGTH = 5;
const CONTENT_MIN_LENGTH = 20;
const COMMENT_MIN_LENGTH = 5;

const getPostAuthor = async (locals: App.Locals, id: string) => {
  const { data } = await locals.supabase
    .from('gatherings')
    .select('id, title, author_id')
    .eq('id', id)
    .maybeSingle();

  return data;
};

const getCommentAuthor = async (locals: App.Locals, id: string) => {
  const { data } = await locals.supabase
    .from('gathering_comments')
    .select('id, author_id, gathering_id, parent_comment_id')
    .eq('id', id)
    .maybeSingle();

  return data;
};

type CommentNotificationContext = {
  locals: App.Locals;
  post: { id: string; title: string | null; author_id: string };
  commenter: { id: string; name: string };
  content: string;
  parentAuthorId?: string | null;
};

const sendCommentNotifications = async ({
  locals,
  post,
  commenter,
  content,
  parentAuthorId
}: CommentNotificationContext) => {
  const emailColumnAvailable = await hasProfileEmailColumn(locals.supabase);

  if (!emailColumnAvailable) {
    console.warn('[comments] profiles.email column is unavailable; skipping notifications.');
    return;
  }

  const adminClient = getSupabaseAdminClient();

  if (!adminClient) {
    console.warn('[comments] Service role client unavailable; skipping comment notifications.');
    return;
  }

  const targetIds = new Set<string>();

  if (post.author_id && post.author_id !== commenter.id) {
    targetIds.add(post.author_id);
  }

  if (parentAuthorId && parentAuthorId !== commenter.id) {
    targetIds.add(parentAuthorId);
  }

  if (targetIds.size === 0) {
    return;
  }

  const { data: targets, error } = await adminClient
    .from('profiles')
    .select('user_id, full_name, email, notify_comments')
    .in('user_id', Array.from(targetIds));

  if (error) {
    console.error('[comments] Failed to load notification targets', error);
    return;
  }

  type TargetRow = {
    user_id: string;
    full_name: string | null;
    email: string | null;
    notify_comments: boolean | null;
  };

  const notifications = targets
    ?.filter((target): target is TargetRow => Boolean(target) && typeof target.user_id === 'string')
    .map((target) => {
      if (!target.email || target.notify_comments === false) {
        return null;
      }

      const isReplyRecipient = Boolean(parentAuthorId && target.user_id === parentAuthorId);

      return notifyGatheringCommentReceived({
        target: { email: target.email, name: target.full_name ?? null, userId: target.user_id },
        post: { id: post.id, title: post.title ?? '모임 라운지 게시글' },
        comment: { authorName: commenter.name, content },
        kind: isReplyRecipient ? 'reply' : 'post'
      });
    })
    .filter(Boolean) as Promise<unknown>[];

  if (notifications.length > 0) {
    await Promise.allSettled(notifications);
  }
};

type ActionIntent =
  | 'updatePost'
  | 'deletePost'
  | 'commentCreate'
  | 'commentUpdate'
  | 'commentDelete';

type ActionState = {
  intent: ActionIntent;
  success: boolean;
  errors?: Record<string, string>;
  values?: Record<string, string>;
  serverMessage?: string;
  commentId?: string;
  parentCommentId?: string | null;
};

export const load: PageServerLoad = async ({ locals, params }) => {
  const session = await locals.getSession();

  if (!session) {
    throw redirect(303, '/?authError=signin-required');
  }

  const gatheringId = params.gatheringId;

  const { data: post, error: postError } = await locals.supabase
    .from('gatherings')
    .select(
      'id, title, content, created_at, updated_at, author_id, author:profiles(full_name, role, photo_url)'
    )
    .eq('id', gatheringId)
    .maybeSingle();

  if (postError) {
    console.error('Failed to load gathering post', postError);
    throw redirect(303, '/gatherings');
  }

  if (!post) {
    throw redirect(303, '/gatherings');
  }

  const { data: comments, error: commentsError } = await locals.supabase
    .from('gathering_comments')
    .select(
      'id, content, created_at, updated_at, author_id, parent_comment_id, author:profiles(full_name, role, photo_url)'
    )
    .eq('gathering_id', gatheringId)
    .order('created_at', { ascending: true });

  if (commentsError) {
    console.error('Failed to load gathering comments', commentsError);
  }

  type CommentRow = {
    id: string;
    content: string;
    created_at: string;
    updated_at: string | null;
    author_id: string;
    parent_comment_id: string | null;
    author: {
      full_name: string | null;
      role: string | null;
      photo_url: string | null;
    } | null;
  };

  type CommentWithReplies = CommentRow & { replies: CommentWithReplies[] };

  type RawCommentRow = CommentRow & {
    author: CommentRow['author'] | CommentRow['author'][];
  };

  const commentMap = new Map<string, CommentWithReplies>();

  for (const rawComment of (comments ?? []) as RawCommentRow[]) {
    const authorRecord = rawComment.author;
    const author = Array.isArray(authorRecord) ? authorRecord[0] : authorRecord;
    const normalizedAuthor = author
      ? {
          full_name: typeof author.full_name === 'string' ? author.full_name : null,
          role: typeof author.role === 'string' ? author.role : null,
          photo_url: typeof author.photo_url === 'string' ? author.photo_url : null
        }
      : null;

    const normalized: CommentRow = {
      id: rawComment.id,
      content: rawComment.content,
      created_at: rawComment.created_at,
      updated_at: rawComment.updated_at,
      author_id: rawComment.author_id,
      parent_comment_id: rawComment.parent_comment_id,
      author: normalizedAuthor
    };

    commentMap.set(rawComment.id, {
      ...normalized,
      replies: []
    });
  }

  const rootComments: CommentWithReplies[] = [];

  for (const entry of commentMap.values()) {
    if (entry.parent_comment_id && commentMap.has(entry.parent_comment_id)) {
      const parent = commentMap.get(entry.parent_comment_id);
      if (parent) {
        parent.replies.push(entry);
      }
    } else if (!entry.parent_comment_id) {
      rootComments.push(entry);
    }
  }

  const sortByCreatedAt = (list: CommentWithReplies[]) => {
    list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    for (const item of list) {
      if (item.replies.length > 0) {
        sortByCreatedAt(item.replies);
      }
    }
  };

  sortByCreatedAt(rootComments);

  return {
    session,
    post,
    comments: rootComments,
    loadError: commentsError ? '댓글을 모두 불러오지 못했습니다.' : null
  };
};

export const actions: Actions = {
  updatePost: async ({ request, locals, params }) => {
    const session = await locals.getSession();

    if (!session) {
      throw redirect(303, '/?authError=signin-required');
    }

    const gatheringId = params.gatheringId;
    const ownership = await getPostAuthor(locals, gatheringId);

    if (!ownership || ownership.author_id !== session.user.id) {
      return fail(403, {
        intent: 'updatePost',
        success: false,
        serverMessage: '게시글을 수정할 권한이 없습니다.'
      } satisfies ActionState);
    }

    const formData = await request.formData();
    const title = (formData.get('title') ?? '').toString().trim();
    const content = (formData.get('content') ?? '').toString().trim();

    const errors: Record<string, string> = {};

    if (title.length < TITLE_MIN_LENGTH) {
      errors.title = `제목은 최소 ${TITLE_MIN_LENGTH}자 이상 입력해주세요.`;
    }

    if (content.length < CONTENT_MIN_LENGTH) {
      errors.content = `내용은 최소 ${CONTENT_MIN_LENGTH}자 이상 입력해주세요.`;
    }

    if (Object.keys(errors).length > 0) {
      return fail(400, {
        intent: 'updatePost',
        success: false,
        errors,
        values: { title, content }
      } satisfies ActionState);
    }

    const { error } = await locals.supabase
      .from('gatherings')
      .update({
        title,
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', gatheringId);

    if (error) {
      console.error('Failed to update gathering post', error);
      return fail(500, {
        intent: 'updatePost',
        success: false,
        serverMessage: '게시글 수정 중 오류가 발생했습니다.'
      } satisfies ActionState);
    }

    return {
      intent: 'updatePost',
      success: true
    } satisfies ActionState;
  },
  deletePost: async ({ locals, params }) => {
    const session = await locals.getSession();

    if (!session) {
      throw redirect(303, '/?authError=signin-required');
    }

    const gatheringId = params.gatheringId;
    const ownership = await getPostAuthor(locals, gatheringId);

    if (!ownership || ownership.author_id !== session.user.id) {
      return fail(403, {
        intent: 'deletePost',
        success: false,
        serverMessage: '게시글을 삭제할 권한이 없습니다.'
      } satisfies ActionState);
    }

    const { error } = await locals.supabase.from('gatherings').delete().eq('id', gatheringId);

    if (error) {
      console.error('Failed to delete gathering post', error);
      return fail(500, {
        intent: 'deletePost',
        success: false,
        serverMessage: '게시글 삭제 중 오류가 발생했습니다.'
      } satisfies ActionState);
    }

    throw redirect(303, '/gatherings');
  },
  commentCreate: async ({ request, locals, params }) => {
    const session = await locals.getSession();

    if (!session) {
      throw redirect(303, '/?authError=signin-required');
    }

    const gatheringId = params.gatheringId;
    const formData = await request.formData();
    const content = (formData.get('content') ?? '').toString().trim();
    const parentCommentIdRaw = formData.get('parentCommentId');
    const parentCommentId =
      typeof parentCommentIdRaw === 'string' && parentCommentIdRaw.length > 0
        ? parentCommentIdRaw
        : null;

    if (content.length < COMMENT_MIN_LENGTH) {
      return fail(400, {
        intent: 'commentCreate',
        success: false,
        errors: { content: `댓글은 최소 ${COMMENT_MIN_LENGTH}자 이상 입력해주세요.` },
        values: { content },
        parentCommentId
      } satisfies ActionState);
    }

    const post = await getPostAuthor(locals, gatheringId);

    if (!post) {
      return fail(404, {
        intent: 'commentCreate',
        success: false,
        serverMessage: '모임 게시글을 찾을 수 없습니다.',
        parentCommentId
      } satisfies ActionState);
    }

    let parentComment: Awaited<ReturnType<typeof getCommentAuthor>> | null = null;

    if (parentCommentId) {
      parentComment = await getCommentAuthor(locals, parentCommentId);

      if (!parentComment || parentComment.gathering_id !== gatheringId) {
        return fail(400, {
          intent: 'commentCreate',
          success: false,
          serverMessage: '답글을 달 댓글을 찾을 수 없습니다.',
          values: { content },
          parentCommentId
        } satisfies ActionState);
      }

      if (parentComment.parent_comment_id) {
        return fail(400, {
          intent: 'commentCreate',
          success: false,
          serverMessage: '대댓글에는 다시 답글을 작성할 수 없습니다.',
          values: { content },
          parentCommentId
        } satisfies ActionState);
      }
    }

    const { error } = await locals.supabase.from('gathering_comments').insert({
      gathering_id: gatheringId,
      content,
      author_id: session.user.id,
      parent_comment_id: parentCommentId
    });

    if (error) {
      console.error('Failed to create gathering comment', error);
      return fail(500, {
        intent: 'commentCreate',
        success: false,
        serverMessage: '댓글을 등록하지 못했습니다. 잠시 후 다시 시도해주세요.',
        parentCommentId
      } satisfies ActionState);
    }

    const { data: commenterProfile } = await locals.supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', session.user.id)
      .maybeSingle();

    const commenterName =
      commenterProfile?.full_name ?? session.user.user_metadata.full_name ?? '알 수 없는 멤버';

    try {
      await sendCommentNotifications({
        locals,
        post,
        commenter: { id: session.user.id, name: commenterName },
        content,
        parentAuthorId: parentComment?.author_id ?? null
      });
    } catch (notificationError) {
      console.error('[comments] Failed to dispatch comment notifications', notificationError);
    }

    return {
      intent: 'commentCreate',
      success: true,
      parentCommentId
    } satisfies ActionState;
  },
  commentUpdate: async ({ request, locals }) => {
    const session = await locals.getSession();

    if (!session) {
      throw redirect(303, '/?authError=signin-required');
    }

    const formData = await request.formData();
    const commentId = (formData.get('commentId') ?? '').toString();

    if (!commentId) {
      return fail(400, {
        intent: 'commentUpdate',
        success: false,
        serverMessage: '수정할 댓글을 찾을 수 없습니다.'
      } satisfies ActionState);
    }

    const comment = await getCommentAuthor(locals, commentId);

    if (!comment || comment.author_id !== session.user.id) {
      return fail(403, {
        intent: 'commentUpdate',
        success: false,
        serverMessage: '댓글을 수정할 권한이 없습니다.',
        commentId
      } satisfies ActionState);
    }

    const content = (formData.get('content') ?? '').toString().trim();

    if (content.length < COMMENT_MIN_LENGTH) {
      return fail(400, {
        intent: 'commentUpdate',
        success: false,
        errors: { content: `댓글은 최소 ${COMMENT_MIN_LENGTH}자 이상 입력해주세요.` },
        values: { content },
        commentId
      } satisfies ActionState);
    }

    const { error } = await locals.supabase
      .from('gathering_comments')
      .update({
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId);

    if (error) {
      console.error('Failed to update gathering comment', error);
      return fail(500, {
        intent: 'commentUpdate',
        success: false,
        serverMessage: '댓글을 수정하지 못했습니다.',
        commentId
      } satisfies ActionState);
    }

    return {
      intent: 'commentUpdate',
      success: true,
      commentId
    } satisfies ActionState;
  },
  commentDelete: async ({ request, locals }) => {
    const session = await locals.getSession();

    if (!session) {
      throw redirect(303, '/?authError=signin-required');
    }

    const formData = await request.formData();
    const commentId = (formData.get('commentId') ?? '').toString();

    if (!commentId) {
      return fail(400, {
        intent: 'commentDelete',
        success: false,
        serverMessage: '삭제할 댓글을 찾을 수 없습니다.'
      } satisfies ActionState);
    }

    const comment = await getCommentAuthor(locals, commentId);

    if (!comment || comment.author_id !== session.user.id) {
      return fail(403, {
        intent: 'commentDelete',
        success: false,
        serverMessage: '댓글을 삭제할 권한이 없습니다.'
      } satisfies ActionState);
    }

    const { error } = await locals.supabase.from('gathering_comments').delete().eq('id', commentId);

    if (error) {
      console.error('Failed to delete gathering comment', error);
      return fail(500, {
        intent: 'commentDelete',
        success: false,
        serverMessage: '댓글을 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.'
      } satisfies ActionState);
    }

    return {
      intent: 'commentDelete',
      success: true
    } satisfies ActionState;
  }
};
