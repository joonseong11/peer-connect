import { fail, redirect } from '@sveltejs/kit';
import {
	INVITES_ENABLED,
	INVITE_CARD_SLOT_COUNT,
	INVITE_UNLIMITED_SLOT_INDEX,
	INVITE_UNLIMITED_USER_IDS,
	INVITE_FALLBACK_CODE
} from '$lib/config';
import type { Actions, PageServerLoad } from './$types';

type InviteSlotDefinition = {
	index: number;
	title: string;
	description: string;
	maxRedemptions: number | null;
	betaUnlimited: boolean;
};

type InviteRedemptionRecord = {
	id: string;
	redeemed_at: string;
	invitee_user_id: string | null;
	invitee?: {
		full_name: string | null;
		role: string | null;
	} | null;
};

type InviteRow = {
	id: string;
	code: string;
	slot_index: number | null;
	max_redemptions: number | null;
	beta_unlimited: boolean;
	created_at: string | null;
	deactivated_at: string | null;
	invite_redemptions?: InviteRedemptionRecord[];
};

type InviteCardState = {
	slot: InviteSlotDefinition;
	invite: {
		id: string;
		code: string;
		created_at: string | null;
		deactivated_at: string | null;
		max_redemptions: number | null;
		beta_unlimited: boolean;
	} | null;
	redemptions: InviteRedemptionRecord[];
	redemptionCount: number;
	remainingUses: number | null;
	state: 'empty' | 'active' | 'fulfilled' | 'unlimited';
};

type RedeemedInviteSummary = {
	id: string;
	redeemed_at: string | null;
	invite: {
		id: string;
		inviter_user_id: string | null;
		inviter?: {
			full_name: string | null;
			role: string | null;
		} | null;
	};
};

const unlimitedUserSet = new Set(INVITE_UNLIMITED_USER_IDS);

const describeSlot = (index: number, unlimited: boolean) => {
	if (unlimited) {
		return {
			title: '무제한 초대권',
			description: '이 초대권 하나로 원하는 만큼 동료를 초대할 수 있어요.'
		};
	}

	if (index === 1) {
		return {
			title: '동료 초대권 #1',
			description: '신뢰할 수 있는 동료 한 명을 초대할 수 있어요.'
		};
	}

	return {
		title: `동료 초대권 #${index}`,
		description: '추가로 한 명의 동료를 초대할 수 있어요.'
	};
};

const buildInviteSlots = (userId: string): InviteSlotDefinition[] => {
	const slots: InviteSlotDefinition[] = [];
	for (let index = 1; index <= INVITE_CARD_SLOT_COUNT; index += 1) {
		const unlimited = unlimitedUserSet.has(userId) && index === INVITE_UNLIMITED_SLOT_INDEX;
		const copy = describeSlot(index, unlimited);
		slots.push({
			index,
			title: copy.title,
			description: copy.description,
			maxRedemptions: unlimited ? null : 1,
			betaUnlimited: unlimited
		});
	}
	return slots;
};

const normalizeCode = (code: string) => code.trim().toUpperCase();

const createInviteCode = () => {
	return crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase();
};

const buildStatusMessage = (status: string | null, code: string | null) => {
	if (status === 'generated' && code) {
		return `새 초대 코드가 생성되었습니다: ${code}`;
	}
	if (status === 'redeemed') {
		return '초대 코드가 연결되었습니다. 초대한 동료의 프로필에서 추천을 남겨보세요!';
	}
	if (status === 'invalid') {
		return '초대 코드를 확인할 수 없습니다. 다시 시도해주세요.';
	}
	return null;
};

const fetchInviteCards = async (
	locals: App.Locals,
	userId: string,
	slots: InviteSlotDefinition[]
) => {
	const { data, error } = await locals.supabase
		.from('invites')
		.select(
			'id, code, slot_index, max_redemptions, beta_unlimited, created_at, deactivated_at, invite_redemptions(id, redeemed_at, invitee_user_id, invitee:profiles!invite_redemptions_invitee_user_id_fkey(full_name, role))'
		)
		.eq('inviter_user_id', userId)
		.order('slot_index', { ascending: true });

	if (error) {
		console.error('Failed to load generated invites', error);
	}

	const invitesBySlot = new Map<number, InviteRow>();

	for (const rawInvite of data ?? []) {
		const redemptionsRaw = Array.isArray((rawInvite as any).invite_redemptions)
			? ((rawInvite as any).invite_redemptions as Array<any>)
			: [];

		const redemptions: InviteRedemptionRecord[] = redemptionsRaw.map((entry) => {
			const inviteeRaw = Array.isArray(entry.invitee) ? entry.invitee[0] : entry.invitee;
			return {
				id: String(entry.id),
				redeemed_at: entry.redeemed_at ? String(entry.redeemed_at) : new Date().toISOString(),
				invitee_user_id: entry.invitee_user_id ? String(entry.invitee_user_id) : null,
				invitee: inviteeRaw
					? {
							full_name:
								typeof inviteeRaw.full_name === 'string' ? inviteeRaw.full_name : null,
							role: typeof inviteeRaw.role === 'string' ? inviteeRaw.role : null
						}
					: null
			};
		});

		const inviteRow: InviteRow = {
			id: String(rawInvite.id),
			code: rawInvite.code ? String(rawInvite.code) : '',
			slot_index: typeof rawInvite.slot_index === 'number' ? rawInvite.slot_index : null,
			max_redemptions:
				typeof rawInvite.max_redemptions === 'number' ? rawInvite.max_redemptions : null,
			beta_unlimited: Boolean(rawInvite.beta_unlimited),
			created_at: rawInvite.created_at ?? null,
			deactivated_at: rawInvite.deactivated_at ?? null,
			invite_redemptions: redemptions
		};

		if (typeof inviteRow.slot_index === 'number') {
			invitesBySlot.set(inviteRow.slot_index, inviteRow);
		}
	}

	const cards: InviteCardState[] = slots.map((slot) => {
		const invite = invitesBySlot.get(slot.index) ?? null;
		const redemptions = (invite?.invite_redemptions ?? []) as InviteRedemptionRecord[];
		const redemptionCount = redemptions.length;
		const remainingUses =
			slot.maxRedemptions === null
				? null
				: Math.max(slot.maxRedemptions - redemptionCount, 0);

		let state: InviteCardState['state'] = 'empty';

		if (invite) {
			if (slot.betaUnlimited) {
				state = 'unlimited';
			} else if (remainingUses !== null && remainingUses <= 0) {
				state = 'fulfilled';
			} else {
				state = 'active';
			}
		}

		const sortedRedemptions = [...redemptions].sort(
			(a, b) => new Date(a.redeemed_at).getTime() - new Date(b.redeemed_at).getTime()
		);

		return {
			slot,
			invite: invite
				? {
						id: invite.id,
						code: invite.code,
						created_at: invite.created_at,
						deactivated_at: invite.deactivated_at,
						max_redemptions: slot.maxRedemptions,
						beta_unlimited: slot.betaUnlimited
					}
				: null,
			redemptions: sortedRedemptions,
			redemptionCount,
			remainingUses,
			state
		};
	});

	const activeCount = cards.filter((card) => {
		if (!card.invite) {
			return false;
		}
		if (card.slot.betaUnlimited) {
			return true;
		}
		return (card.remainingUses ?? 0) > 0;
	}).length;

	return { cards, activeCount };
};

const ensureInviteSlot = (slotIndex: number, slots: InviteSlotDefinition[]) => {
	const slot = slots.find((candidate) => candidate.index === slotIndex);
	if (!slot) {
		throw new Error(`Unknown invite slot index: ${slotIndex}`);
	}
	return slot;
};

const requiresLinkedInviteMessage =
	'먼저 초대 코드를 연결해야 초대장을 사용할 수 있어요.';

export const load: PageServerLoad = async ({ locals, url }) => {
	const session = await locals.getSession();

	if (!session) {
		throw redirect(303, '/?authError=signin-required');
	}

	if (!INVITES_ENABLED) {
		return {
			session,
			redeemedInvite: null,
			cards: [],
			activeCount: 0,
			maxInvites: INVITE_CARD_SLOT_COUNT,
			statusMessage: '초대 기능은 현재 비활성화되어 있습니다.',
			invitesEnabled: INVITES_ENABLED,
			hasLinkedInvite: false
		};
	}

	const {
		data: redeemedInvite,
		error: redeemedError
	} = await locals.supabase
		.from('invite_redemptions')
		.select(
			'id, redeemed_at, invite:invites!inner(id, inviter_user_id, inviter:profiles!invites_inviter_user_id_fkey(full_name, role))'
		)
		.eq('invitee_user_id', session.user.id)
		.order('redeemed_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	if (redeemedError) {
		console.error('Failed to load redeemed invite info', redeemedError);
	}

	let redeemedSummary: RedeemedInviteSummary | null = null;

	if (redeemedInvite) {
		const rawInvite = Array.isArray(redeemedInvite.invite)
			? redeemedInvite.invite[0]
			: redeemedInvite.invite;
		if (rawInvite) {
			const rawInviter = Array.isArray(rawInvite.inviter) ? rawInvite.inviter[0] : rawInvite.inviter;
			redeemedSummary = {
				id: String(redeemedInvite.id),
				redeemed_at: redeemedInvite.redeemed_at ?? null,
				invite: {
					id: String(rawInvite.id),
					inviter_user_id: rawInvite.inviter_user_id
						? String(rawInvite.inviter_user_id)
						: null,
					inviter: rawInviter
						? {
								full_name:
									typeof rawInviter.full_name === 'string' ? rawInviter.full_name : null,
								role: typeof rawInviter.role === 'string' ? rawInviter.role : null
							}
						: null
				}
			};
		}
	}

	const slots = buildInviteSlots(session.user.id);
	const { cards, activeCount } = await fetchInviteCards(locals, session.user.id, slots);

	const statusParam = url.searchParams.get('status');
	const codeParam = url.searchParams.get('code');
	const statusMessage = buildStatusMessage(statusParam, codeParam);

	return {
		session,
		redeemedInvite: redeemedSummary,
		cards,
		activeCount,
		maxInvites: slots.length,
		statusMessage,
		invitesEnabled: INVITES_ENABLED,
		hasLinkedInvite: Boolean(redeemedInvite)
	};
};

export const actions: Actions = {
	generate: async ({ locals, request }) => {
		if (!INVITES_ENABLED) {
			return fail(400, {
				success: false,
				generateError: '현재 초대 기능이 비활성화되어 있습니다.'
			});
		}

		const session = await locals.getSession();

		if (!session) {
			throw redirect(303, '/?authError=signin-required');
		}

		const slots = buildInviteSlots(session.user.id);

		const formData = await request.formData();
		const slotValue = formData.get('slot');
		const slotIndex = typeof slotValue === 'string' ? Number.parseInt(slotValue, 10) : NaN;

		if (!Number.isInteger(slotIndex)) {
			return fail(400, {
				success: false,
				generateError: '올바르지 않은 초대권 슬롯입니다.'
			});
		}

		let slotDefinition: InviteSlotDefinition;
		try {
			slotDefinition = ensureInviteSlot(slotIndex, slots);
		} catch (error) {
			console.error('[invite] Attempt to use undefined slot', error);
			return fail(400, {
				success: false,
				generateError: '지원하지 않는 초대권입니다.'
			});
		}

		const { data: linkedInvite } = await locals.supabase
			.from('invite_redemptions')
			.select('id')
			.eq('invitee_user_id', session.user.id)
			.maybeSingle();

		if (!linkedInvite) {
			return fail(400, {
				success: false,
				generateError: requiresLinkedInviteMessage
			});
		}

		const {
			data: existingInvite,
			error: lookupError
		} = await locals.supabase
			.from('invites')
			.select('id, code')
			.eq('inviter_user_id', session.user.id)
			.eq('slot_index', slotDefinition.index)
			.maybeSingle();

		if (lookupError) {
			console.error('Failed to verify invite slot usage', lookupError);
		}

		if (existingInvite) {
			const { cards, activeCount } = await fetchInviteCards(locals, session.user.id, slots);
			return fail(400, {
				success: false,
				generateError: '이미 발급된 초대권입니다. 사용 기록을 확인해보세요.',
				cards,
				activeCount
			});
		}

		const code = createInviteCode();

		const { error } = await locals.supabase.from('invites').insert({
			code,
			inviter_user_id: session.user.id,
			slot_index: slotDefinition.index,
			max_redemptions: slotDefinition.maxRedemptions,
			beta_unlimited: slotDefinition.betaUnlimited
		});

		if (error) {
			console.error('Failed to create invite', error);
			return fail(500, {
				success: false,
				generateError: '초대 코드를 생성할 수 없습니다. 잠시 후 다시 시도해주세요.'
			});
		}

		const { cards, activeCount } = await fetchInviteCards(locals, session.user.id, slots);

		return {
			success: true,
			generatedCode: code,
			cards,
			activeCount,
			highlightSlot: slotDefinition.index,
			statusMessage: `${slotDefinition.title}이(가) 활성화됐어요. 코드를 공유해보세요!`
		};
	},
	redeem: async ({ request, locals }) => {
		if (!INVITES_ENABLED) {
			return fail(400, {
				success: false,
				redeemError: '현재 초대 기능이 비활성화되어 있습니다.'
			});
		}

		const session = await locals.getSession();

		if (!session) {
			throw redirect(303, '/?authError=signin-required');
		}

		const formData = await request.formData();
		const codeValue = formData.get('code');
		const code = typeof codeValue === 'string' ? normalizeCode(codeValue) : '';

		if (!code) {
			return fail(400, {
				success: false,
				redeemError: '초대 코드를 입력해주세요.'
			});
		}

		const { data: existingRedeemed } = await locals.supabase
			.from('invite_redemptions')
			.select('id')
			.eq('invitee_user_id', session.user.id)
			.maybeSingle();

		if (existingRedeemed) {
			return fail(400, {
				success: false,
				redeemError: '이미 초대 코드와 연결되어 있습니다.'
			});
		}

		if (INVITE_FALLBACK_CODE && code === INVITE_FALLBACK_CODE) {
			const { count: redemptionCount } = await locals.supabase
				.from('invite_redemptions')
				.select('id', { count: 'exact', head: true });

			if ((redemptionCount ?? 0) > 0) {
				return fail(400, {
					success: false,
					redeemError: '이미 커뮤니티가 열려 있어 이 코드를 사용할 수 없습니다.'
				});
			}

			const {
				data: existingFallbackInvite,
				error: fallbackLookupError
			} = await locals.supabase
				.from('invites')
				.select('id, deactivated_at')
				.eq('code', INVITE_FALLBACK_CODE)
				.maybeSingle();

			if (fallbackLookupError) {
				console.error('Failed to lookup fallback invite', fallbackLookupError);
				return fail(500, {
					success: false,
					redeemError: '초대 코드를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.'
				});
			}

			let fallbackInviteId: string | null = existingFallbackInvite?.id
				? String(existingFallbackInvite.id)
				: null;

			if (!fallbackInviteId) {
				const {
					data: insertedFallback,
					error: insertFallbackError
				} = await locals.supabase
					.from('invites')
					.insert({
						code: INVITE_FALLBACK_CODE,
						inviter_user_id: null,
						slot_index: 0,
						max_redemptions: 1,
						beta_unlimited: false
					})
					.select('id')
					.single();

				if (insertFallbackError) {
					console.error('Failed to create fallback invite', insertFallbackError);
					return fail(500, {
						success: false,
						redeemError: '초대 코드를 생성하지 못했습니다. 잠시 후 다시 시도해주세요.'
					});
				}

				fallbackInviteId = String(insertedFallback.id);
			}

			if (!fallbackInviteId) {
				return fail(500, {
					success: false,
					redeemError: '초대 코드를 처리하지 못했습니다.'
				});
			}

			const {
				count: fallbackUsageCount
			} = await locals.supabase
				.from('invite_redemptions')
				.select('id', {
					head: true,
					count: 'exact'
				})
				.eq('invite_id', fallbackInviteId);

			if ((fallbackUsageCount ?? 0) > 0) {
				return fail(400, {
					success: false,
					redeemError: '이미 사용된 초대 코드입니다.'
				});
			}

			const { error: fallbackRedeemError } = await locals.supabase
				.from('invite_redemptions')
				.insert({
					invite_id: fallbackInviteId,
					invitee_user_id: session.user.id
				});

			if (fallbackRedeemError) {
				console.error('Failed to redeem fallback invite', fallbackRedeemError);
				return fail(500, {
					success: false,
					redeemError: '초대 코드를 연결하지 못했습니다. 잠시 후 다시 시도해주세요.'
				});
			}

			const nowIso = new Date().toISOString();
			const { error: fallbackDeactivateError } = await locals.supabase
				.from('invites')
				.update({ deactivated_at: nowIso })
				.eq('id', fallbackInviteId)
				.is('deactivated_at', null);

			if (fallbackDeactivateError) {
				console.error('Failed to deactivate fallback invite', fallbackDeactivateError);
			}

			throw redirect(303, '/profile?onboarding=seed');
		}

		const {
			data: invite,
			error: inviteError
		} = await locals.supabase
			.from('invites')
			.select(
				'id, code, inviter_user_id, slot_index, max_redemptions, beta_unlimited, deactivated_at, invite_redemptions(id)'
			)
			.eq('code', code)
			.maybeSingle();

		if (inviteError) {
			console.error('Failed to lookup invite by code', inviteError);
		}

		if (!invite) {
			return fail(400, {
				success: false,
				redeemError: '초대 코드를 찾을 수 없습니다.'
			});
		}

		const redemptionCount = invite.invite_redemptions?.length ?? 0;
		const isUnlimited =
			invite.beta_unlimited ||
			invite.max_redemptions === null ||
			(invite.max_redemptions ?? 0) < 0;
		const maxRedemptions = invite.max_redemptions ?? null;

		if (!isUnlimited && maxRedemptions !== null && redemptionCount >= maxRedemptions) {
			return fail(400, {
				success: false,
				redeemError: '이미 모두 사용된 초대 코드입니다.'
			});
		}

		const { error: insertError } = await locals.supabase.from('invite_redemptions').insert({
			invite_id: invite.id,
			invitee_user_id: session.user.id
		});

		if (insertError) {
			console.error('Failed to redeem invite', insertError);
			return fail(500, {
				success: false,
				redeemError: '초대 코드를 연결하지 못했습니다. 이미 사용되었을 수 있어요.'
			});
		}

		throw redirect(303, `/members/${invite.inviter_user_id}?endorsementStatus=prompt`);
	}
};
