import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { notifyMeetingCreated } from '$lib/server/notifications';
import { hasProfileEmailColumn } from '$lib/server/profileEmailColumn';
import { getSupabaseAdminClient } from '$lib/server/supabaseAdmin';

const TITLE_MIN_LENGTH = 5;
const CONTENT_MIN_LENGTH = 20;

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

		const { data: inserted, error: insertError } = await locals.supabase
			.from('gatherings')
			.insert({
				title,
				content,
				author_id: session.user.id
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

		const emailColumnAvailable = await hasProfileEmailColumn(locals.supabase);

		const { data: authorProfile } = await locals.supabase
			.from('profiles')
			.select('full_name')
			.eq('user_id', session.user.id)
			.maybeSingle();

		const authorName =
			authorProfile?.full_name ?? session.user.user_metadata.full_name ?? '알 수 없는 멤버';

		if (emailColumnAvailable) {
			const adminClient = getSupabaseAdminClient();

			if (!adminClient) {
				console.warn(
					'[gatherings] Skipping meeting notification because SUPABASE_SERVICE_ROLE_KEY is not configured.'
				);
			} else {
				const { data: recipients, error: recipientsError } = await adminClient
					.from('profiles')
					.select('user_id, email, full_name')
					.not('email', 'is', null);

				if (recipientsError) {
					console.error('Failed to load recipients for meeting notification', recipientsError);
				} else {
					const filteredRecipients =
						recipients
							?.filter(
								(recipient) =>
									recipient.email &&
									recipient.email.length > 0 &&
									recipient.user_id !== session.user.id
							)
							.map((recipient) => ({
								email: recipient.email as string,
								name: recipient.full_name ?? null
							})) ?? [];

					if (filteredRecipients.length > 0) {
						await notifyMeetingCreated({
							recipients: filteredRecipients,
							post: {
								id: inserted.id,
								title,
								authorName,
								content
							}
						});
					}
				}
			}
		} else {
			console.warn(
				'[gatherings] Skipping meeting notification because profiles.email column is unavailable.'
			);
		}

		throw redirect(303, `/gatherings/${inserted.id}`);
	}
};
