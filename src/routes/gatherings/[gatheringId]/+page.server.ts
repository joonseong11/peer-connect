import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const TITLE_MIN_LENGTH = 5;
const CONTENT_MIN_LENGTH = 20;
const COMMENT_MIN_LENGTH = 5;

const getPostAuthor = async (locals: App.Locals, id: string) => {
	const { data } = await locals.supabase
		.from('gatherings')
		.select('id, author_id')
		.eq('id', id)
		.maybeSingle();

	return data;
};

const getCommentAuthor = async (locals: App.Locals, id: string) => {
	const { data } = await locals.supabase
		.from('gathering_comments')
		.select('id, author_id, gathering_id')
		.eq('id', id)
		.maybeSingle();

	return data;
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
			'id, content, created_at, updated_at, author_id, author:profiles(full_name, role, photo_url)'
		)
		.eq('gathering_id', gatheringId)
		.order('created_at', { ascending: true });

	if (commentsError) {
		console.error('Failed to load gathering comments', commentsError);
	}

	return {
		session,
		post,
		comments: comments ?? [],
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

		if (content.length < COMMENT_MIN_LENGTH) {
			return fail(400, {
				intent: 'commentCreate',
				success: false,
				errors: { content: `댓글은 최소 ${COMMENT_MIN_LENGTH}자 이상 입력해주세요.` },
				values: { content }
			} satisfies ActionState);
		}

		const { error } = await locals.supabase.from('gathering_comments').insert({
			gathering_id: gatheringId,
			content,
			author_id: session.user.id
		});

		if (error) {
			console.error('Failed to create gathering comment', error);
			return fail(500, {
				intent: 'commentCreate',
				success: false,
				serverMessage: '댓글을 등록하지 못했습니다. 잠시 후 다시 시도해주세요.'
			} satisfies ActionState);
		}

		return {
			intent: 'commentCreate',
			success: true
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
