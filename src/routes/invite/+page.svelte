<script lang="ts">
	import { onMount } from 'svelte';
	import type { ActionData, PageData } from './$types';

	const { data, form } = $props<{ data: PageData; form: ActionData }>();

	const {
		redeemedInvite,
		cards,
		activeCount,
		maxInvites,
		statusMessage,
		invitesEnabled,
		hasLinkedInvite
	} = data;

	const redeemError = $derived(form?.redeemError ?? null);
	const generateError = $derived(form?.generateError ?? null);
	const generatedCode = $derived(form?.generatedCode ?? null);
	const currentCards = $derived((form?.cards as PageData['cards'] | undefined) ?? cards);
	const currentActiveCount = $derived(form?.activeCount ?? activeCount);
	const currentStatusMessage = $derived(form?.statusMessage ?? statusMessage);

	let expandedSlot = $state<number | null>(form?.highlightSlot ?? null);
	let copiedSlot = $state<number | null>(null);
	let copyErrorSlot = $state<number | null>(null);
	let origin = $state('');

	$effect(() => {
		if (form?.highlightSlot != null) {
			expandedSlot = form.highlightSlot;
		}
	});

	onMount(() => {
		origin = window.location.origin;
	});

	const isExpanded = (slotIndex: number) => expandedSlot === slotIndex;

	const toggleCard = (slotIndex: number) => {
		expandedSlot = expandedSlot === slotIndex ? null : slotIndex;
	};

	const shareUrlFor = (code: string | null) => {
		if (!code || !origin) {
			return '';
		}
		return `${origin.replace(/\/$/, '')}/invite?code=${code}`;
	};

	const copyShareLink = async (slotIndex: number, shareUrl: string) => {
		if (!shareUrl) {
			return;
		}

		let copied = false;

		if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
			try {
				await navigator.clipboard.writeText(shareUrl);
				copied = true;
			} catch (error) {
				console.error('[invite] Failed to copy share link via clipboard API', error);
			}
		}

		if (!copied && typeof document !== 'undefined') {
			try {
				const textarea = document.createElement('textarea');
				textarea.value = shareUrl;
				textarea.setAttribute('readonly', '');
				textarea.style.position = 'absolute';
				textarea.style.left = '-9999px';
				document.body.appendChild(textarea);
				textarea.select();
				copied = document.execCommand('copy');
				document.body.removeChild(textarea);
			} catch (error) {
				console.error('[invite] Failed to copy share link via fallback', error);
				copied = false;
			}
		}

		if (copied) {
			copyErrorSlot = null;
			copiedSlot = slotIndex;
			setTimeout(() => {
				if (copiedSlot === slotIndex) {
					copiedSlot = null;
				}
			}, 2400);
		} else {
			copyErrorSlot = slotIndex;
			setTimeout(() => {
				if (copyErrorSlot === slotIndex) {
					copyErrorSlot = null;
				}
			}, 2400);
		}
	};

	const slotLabel = (card: PageData['cards'][number]) => {
		if (!card.invite) {
			return '활성화 대기';
		}
		if (card.state === 'fulfilled') {
			return '사용 완료';
		}
		if (card.state === 'unlimited') {
			return '무제한 초대';
		}
		return '초대권 활성화';
	};
</script>

<svelte:head>
	<title>초대 관리 · Peer Connect</title>
</svelte:head>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-6 px-5 pb-16 pt-14 sm:px-8">
	<section class="glass-panel space-y-4">
		<h1 class="text-3xl font-semibold text-peer-navy">Peer Connect 초대장</h1>
		{#if invitesEnabled}
			<p class="text-slate-600">
				신뢰할 수 있는 동료를 초대해 네트워크를 확장하세요. 초대링크로 가입한 멤버는 가입 직후 당신의 프로필에서
				추천을 남기도록 안내받습니다.
			</p>
		{:else}
			<p class="text-slate-600">
				현재는 초대 기능을 테스트 목적으로 비활성화해 두었습니다. 로그인 후 바로 프로필을 작성하고 동료들을 둘러볼 수 있습니다.
			</p>
		{/if}
		{#if currentStatusMessage}
			<p class="text-sm font-semibold text-peer-indigo" role="status">{currentStatusMessage}</p>
		{/if}
		{#if generatedCode}
			<p class="text-xs font-medium text-slate-500">
				방금 발급된 초대 코드: <span class="font-semibold text-peer-navy">{generatedCode}</span>
			</p>
		{/if}
	</section>

	{#if invitesEnabled && redeemedInvite}
		<section class="glass-panel space-y-3">
			<h2 class="text-2xl font-semibold text-peer-navy">내가 초대를 받은 곳</h2>
			<p class="text-sm text-slate-600">
				<span class="font-semibold text-slate-500">초대한 동료:</span>
				{#if redeemedInvite.invite.inviter}
					<strong class="text-peer-navy">{redeemedInvite.invite.inviter.full_name}</strong>
					{#if redeemedInvite.invite.inviter.role}
						· {redeemedInvite.invite.inviter.role}
					{/if}
				{:else}
					알 수 없는 동료
				{/if}
			</p>
			{#if redeemedInvite.redeemed_at}
				<p class="text-xs text-slate-500">
					<span class="font-semibold text-slate-500">연결 시점:</span>
					{new Date(redeemedInvite.redeemed_at).toLocaleString('ko-KR')}
				</p>
			{/if}
			{#if redeemedInvite.invite.inviter_user_id}
				<a class="btn btn-primary" href={`/members/${redeemedInvite.invite.inviter_user_id}`}>
					추천 남기러 가기
				</a>
			{/if}
		</section>
	{:else if invitesEnabled}
		<section class="glass-panel space-y-4">
			<h2 class="text-2xl font-semibold text-peer-navy">초대 코드 입력</h2>
			<p class="text-sm text-slate-500">초대받은 코드 1개를 입력하면 커뮤니티 이용이 활성화됩니다.</p>
			<form method="post" action="?/redeem" class="space-y-3">
				<label class="flex flex-col gap-2 text-sm font-semibold text-slate-700">
					<span>초대 코드</span>
					<input
						name="code"
						type="text"
						placeholder="예: AB12CD34"
						required
						minlength={6}
						maxlength={16}
						class="w-full max-w-xs rounded-2xl border border-slate-300/60 bg-slate-50/90 px-4 py-3 text-sm text-peer-navy shadow-sm transition focus:border-peer-indigo focus:bg-white focus:outline-none focus:ring-2 focus:ring-peer-indigo/30"
					/>
				</label>
				{#if redeemError}
					<p class="text-sm font-medium text-rose-500" role="alert">{redeemError}</p>
				{/if}
				<button type="submit" class="btn btn-primary">코드 연결하기</button>
			</form>
		</section>
	{/if}

	{#if invitesEnabled}
		<section class="glass-panel space-y-5">
			<header class="flex flex-wrap items-end justify-between gap-2">
				<h2 class="text-2xl font-semibold text-peer-navy">나의 초대권</h2>
				<p class="text-sm text-slate-500">현재 사용 가능: {currentActiveCount}/{maxInvites}개</p>
			</header>
			{#if generateError}
				<p class="text-sm font-medium text-rose-500" role="alert">{generateError}</p>
			{/if}

			<ul class="grid gap-4 md:grid-cols-2">
				{#each currentCards as card (card.slot.index)}
					<li>
						<article
							class={`flex h-full flex-col gap-4 rounded-3xl border p-5 transition-all ${
								card.invite
									? card.state === 'fulfilled'
										? 'border-slate-300 bg-slate-100 text-slate-600'
										: card.state === 'unlimited'
											? 'border-peer-indigo/60 bg-gradient-to-br from-peer-indigo/20 via-white to-peer-sky/10 text-peer-navy'
											: 'border-slate-200/60 bg-white/90 text-peer-navy shadow-sm'
									: 'border-dashed border-peer-indigo/40 bg-white/70 text-peer-navy shadow-sm'
							} ${
							isExpanded(card.slot.index) ? 'ring-2 ring-peer-indigo/30' : ''
						}`}
					>
						<header class="flex flex-col gap-2">
								<div class="flex items-center justify-between gap-3">
									<h3 class="text-lg font-semibold">{card.slot.title}</h3>
									<span
										class={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
											card.state === 'fulfilled'
												? 'bg-slate-300 text-slate-600'
												: card.state === 'unlimited'
													? 'bg-gradient-to-r from-peer-indigo/20 to-peer-sky/20 text-peer-indigo'
													: card.invite
														? 'bg-peer-indigo/10 text-peer-indigo'
														: 'bg-slate-200/80 text-slate-600'
										}`}
									>
										{slotLabel(card)}
									</span>
								</div>
								<p class="text-sm text-slate-500">{card.slot.description}</p>
							</header>

							{#if card.invite}
								{@const shareUrl = shareUrlFor(card.invite.code)}
								<button
									type="button"
									class={`inline-flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold shadow-inner transition focus:outline-none focus:ring-2 focus:ring-peer-indigo/30 disabled:cursor-not-allowed ${
										card.state === 'fulfilled'
											? 'border-slate-300 bg-slate-200 text-slate-600 hover:-translate-y-0.5 hover:border-slate-400'
											: 'border-transparent bg-white/40 text-peer-indigo hover:-translate-y-0.5 hover:border-peer-indigo/30'
									}`}
									onclick={() => toggleCard(card.slot.index)}
								>
									<span>
										{card.state === 'fulfilled'
											? '사용 내역 보기'
											: card.state === 'unlimited'
												? '무제한 초대 링크 보기'
												: '초대 코드 · 링크 보기'}
									</span>
									<span class="text-xs text-slate-400">
										{isExpanded(card.slot.index) ? '접기 ▲' : '펼치기 ▼'}
									</span>
								</button>

								{#if isExpanded(card.slot.index)}
									<section class="space-y-4 rounded-2xl border border-slate-200/60 bg-white/90 p-4 text-sm text-slate-600">
										<div class="space-y-2">
											<h4 class="text-xs font-semibold uppercase tracking-wide text-slate-400">
												초대 코드
											</h4>
											<p class="rounded-2xl bg-peer-navy/90 px-4 py-2 text-lg font-semibold text-white">
												{card.invite.code}
											</p>
										</div>
										{#if shareUrl}
											<div class={`space-y-2 ${card.state === 'fulfilled' ? 'text-slate-500' : ''}`}>
												<h4 class="text-xs font-semibold uppercase tracking-wide text-slate-400">
													공유 링크
												</h4>
												<div class="flex flex-wrap items-center gap-2">
													<input
														class={`flex-1 min-w-[220px] rounded-2xl border px-3 py-2 text-xs ${
															card.state === 'fulfilled'
																? 'border-slate-300 bg-slate-100 text-slate-600'
																: 'border-slate-300/60 bg-slate-50 text-slate-600'
														}`}
														type="text"
														readonly
														value={shareUrl}
													/>
													<button
														type="button"
														class={`rounded-full px-4 py-2 text-xs font-semibold text-white shadow transition focus:outline-none focus:ring-2 ${
															card.state === 'fulfilled'
																? 'bg-slate-400 focus:ring-slate-300/60'
																: 'bg-peer-indigo hover:-translate-y-0.5 hover:bg-peer-indigo/90 focus:ring-peer-indigo/40'
														}`}
														onclick={() => copyShareLink(card.slot.index, shareUrl)}
														disabled={card.state === 'fulfilled'}
													>
														복사
													</button>
												</div>
												{#if copiedSlot === card.slot.index && card.state !== 'fulfilled'}
													<p class="text-xs font-semibold text-emerald-600">클립보드에 복사되었습니다.</p>
												{/if}
												{#if copyErrorSlot === card.slot.index}
													<p class="text-xs font-semibold text-rose-500">복사에 실패했어요. 링크를 직접 선택해 주세요.</p>
												{/if}
											</div>
										{/if}
										<div class="space-y-2">
											<h4 class="text-xs font-semibold uppercase tracking-wide text-slate-400">
												사용 현황
											</h4>
											{#if card.state === 'unlimited'}
												<p class="rounded-2xl bg-peer-indigo/10 px-3 py-2 text-xs font-semibold text-peer-indigo">
													총 {card.redemptionCount}명의 멤버에게 공유되었습니다.
												</p>
											{:else}
												<p
													class={`rounded-2xl px-3 py-2 text-xs font-semibold ${
														card.state === 'fulfilled'
															? 'bg-slate-200 text-slate-600'
															: 'bg-slate-100 text-slate-600'
													}`}
												>
													사용 {card.redemptionCount}/{card.invite.max_redemptions ?? 1}회
												</p>
											{/if}
										</div>

										{#if card.redemptionCount > 0}
											<div class="space-y-2">
												<h4 class="text-xs font-semibold uppercase tracking-wide text-slate-400">
													초대한 동료
												</h4>
												<ul
													class={`space-y-2 text-xs text-slate-500`}
												>
													{#each card.redemptions as redemption}
														<li
															class={`rounded-2xl border px-3 py-2 ${
																card.state === 'fulfilled'
																	? 'border-slate-300 bg-slate-100 text-slate-600'
																	: 'border-slate-200/60 bg-slate-50 text-peer-navy'
															}`}
														>
															<div
																class={`font-semibold ${
																	card.state === 'fulfilled' ? 'text-slate-600' : 'text-peer-navy'
																}`}
															>
																{redemption.invitee?.full_name ?? '알 수 없는 동료'}
																{#if redemption.invitee?.role}
																	<span class="text-[10px] text-slate-400">
																		{' '}
																		· {redemption.invitee.role}
																	</span>
																{/if}
															</div>
															<time
																class="text-[10px] text-slate-400"
																datetime={redemption.redeemed_at}
															>
																{new Date(redemption.redeemed_at).toLocaleString('ko-KR')}
															</time>
														</li>
													{/each}
												</ul>
											</div>
										{/if}
									</section>
								{/if}
							{:else}
								<section class="space-y-3 rounded-2xl border border-dashed border-peer-indigo/30 bg-white/80 p-4">
									<p class="text-xs text-slate-500">
										이 초대권을 활성화하면 새로운 동료를 초대할 수 있는 코드와 링크가 생성됩니다.
									</p>
									<form method="post" action="?/generate" class="space-y-2">
										<input type="hidden" name="slot" value={card.slot.index} />
										<button
											type="submit"
											class="w-full rounded-full bg-peer-indigo px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-peer-indigo/90 focus:outline-none focus:ring-2 focus:ring-peer-indigo/40 disabled:cursor-not-allowed disabled:opacity-60"
											disabled={!hasLinkedInvite}
										>
											초대권 활성화하기
										</button>
										{#if !hasLinkedInvite}
											<p class="text-xs font-medium text-slate-500">
												먼저 초대 코드를 연결하면 초대권을 사용할 수 있어요.
											</p>
										{/if}
									</form>
								</section>
							{/if}
						</article>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</main>
