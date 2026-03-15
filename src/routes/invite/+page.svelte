<script lang="ts">
  import { onMount } from 'svelte';
  import { Copy, Sparkles, Ticket } from 'lucide-svelte';
  import MetaTags from '$lib/components/MetaTags.svelte';
  import type { ActionData, PageData } from './$types';

  const { data, form } = $props<{ data: PageData; form: ActionData }>();

  const {
    redeemedInvite,
    cards,
    externalClaims,
    activeCount,
    maxInvites,
    statusMessage,
    invitesEnabled,
    hasLinkedInvite
  } = data;

  const redeemError = $derived(form?.redeemError ?? null);
  const generateError = $derived(form?.generateError ?? null);
  const generatedCode = $derived(form?.generatedCode ?? null);
  const externalClaimError = $derived(form?.externalClaimError ?? null);
  const externalClaimValues = $derived(
    (form?.externalClaimValues as { content?: string } | undefined) ?? { content: '' }
  );
  const externalClaimStatusMessage = $derived(form?.externalClaimStatusMessage ?? null);
  const createdExternalClaimToken = $derived(form?.createdExternalClaimToken ?? null);
  const currentCards = $derived((form?.cards as PageData['cards'] | undefined) ?? cards);
  const currentExternalClaims = $derived(
    (form?.externalClaims as PageData['externalClaims'] | undefined) ?? externalClaims
  );
  const currentActiveCount = $derived(form?.activeCount ?? activeCount);
  const currentStatusMessage = $derived(form?.statusMessage ?? statusMessage);

  let expandedSlot = $state<number | null>(form?.highlightSlot ?? null);
  let copiedSlot = $state<number | null>(null);
  let copyErrorSlot = $state<number | null>(null);
  let copiedExternalClaimId = $state<string | null>(null);
  let copyExternalClaimErrorId = $state<string | null>(null);
  let origin = $state('');
  let handledForm: ActionData | null = null;
  let redeemSubmitting = $state(false);
  let generateSubmittingSlot = $state<number | null>(null);
  let externalClaimSubmitting = $state(false);
  let revokeSubmittingId = $state<string | null>(null);

  $effect(() => {
    if (form !== handledForm) {
      handledForm = form ?? null;
      redeemSubmitting = false;
      generateSubmittingSlot = null;
      externalClaimSubmitting = false;
      revokeSubmittingId = null;
    }
  });

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

  const handleRedeemSubmit = () => {
    redeemSubmitting = true;
  };

  const handleGenerateSubmit = (slotIndex: number) => {
    generateSubmittingSlot = slotIndex;
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

  const externalClaimShareUrlFor = (token: string | null) => {
    if (!token || !origin) {
      return '';
    }

    return `${origin.replace(/\/$/, '')}/claim/${token}`;
  };

  const copyExternalClaimLink = async (claimId: string, shareUrl: string) => {
    if (!shareUrl) {
      return;
    }

    let copied = false;

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        copied = true;
      } catch (error) {
        console.error('[external-endorsements] Failed to copy claim link via clipboard API', error);
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
        console.error('[external-endorsements] Failed to copy claim link via fallback', error);
        copied = false;
      }
    }

    if (copied) {
      copyExternalClaimErrorId = null;
      copiedExternalClaimId = claimId;
      setTimeout(() => {
        if (copiedExternalClaimId === claimId) {
          copiedExternalClaimId = null;
        }
      }, 2400);
    } else {
      copyExternalClaimErrorId = claimId;
      setTimeout(() => {
        if (copyExternalClaimErrorId === claimId) {
          copyExternalClaimErrorId = null;
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
    return '사용 가능';
  };

  const externalClaimStateLabel = (state: PageData['externalClaims'][number]['state']) => {
    switch (state) {
      case 'claimed':
        return '수령 완료';
      case 'revoked':
        return '철회됨';
      case 'expired':
        return '만료됨';
      default:
        return '공유 중';
    }
  };

  const handleExternalClaimSubmit = () => {
    externalClaimSubmitting = true;
  };

  const handleExternalClaimRevoke = (claimId: string) => {
    revokeSubmittingId = claimId;
  };
</script>

<MetaTags
  title="초대 관리 · Peer Connect"
  description="신뢰하는 동료에게 Peer Connect 초대장을 발급하고, 받은 초대 코드도 한 곳에서 관리하세요."
  path="/invite"
  type="website"
/>

<main class="page-shell">
  <section class="surface-panel-strong grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
    <div class="space-y-5">
      <p class="section-kicker text-peer-paper/70">초대 관리</p>
      <div class="space-y-3">
        <h1 class="headline-balance max-w-3xl text-4xl leading-[1.05] text-peer-paper sm:text-5xl">
          신뢰하는 동료를 초대하고 연결 흐름을 관리해보세요
        </h1>
        <p class="max-w-2xl text-base leading-7 text-peer-paper/75 sm:text-lg">
          초대는 이 네트워크의 품질을 결정하는 가장 중요한 장치입니다. 누구를 초대했는지, 어떤
          연결이 만들어졌는지 한곳에서 확인할 수 있습니다.
        </p>
      </div>

      {#if currentStatusMessage}
        <p
          class="rounded-[20px] border border-white/10 bg-white/10 px-4 py-3 text-sm text-peer-paper/80"
          role="status"
        >
          {currentStatusMessage}
        </p>
      {/if}
      {#if generatedCode}
        <p
          class="rounded-[20px] border border-white/10 bg-white/10 px-4 py-3 text-sm text-peer-paper/80"
        >
          방금 생성된 초대 코드: <span class="font-semibold">{generatedCode}</span>
        </p>
      {/if}
    </div>

    <aside class="space-y-4 rounded-[24px] border border-white/10 bg-white/10 p-5">
      <div class="flex items-center gap-3">
        <div
          class="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-white/10 text-peer-paper"
        >
          <Ticket class="h-6 w-6" />
        </div>
        <div>
          <p class="meta-line text-peer-paper/60">초대 현황</p>
          <p class="text-xl font-semibold text-peer-paper">
            현재 사용 가능 {currentActiveCount}/{maxInvites}개
          </p>
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
        <div class="rounded-[20px] border border-white/10 bg-white/10 p-4">
          <p class="meta-line text-peer-paper/60">초대권 상태</p>
          <p class="mt-2 text-lg font-semibold text-peer-paper">
            {#if invitesEnabled}
              사용 가능
            {:else}
              준비 중
            {/if}
          </p>
        </div>
        <div class="rounded-[20px] border border-white/10 bg-white/10 p-4">
          <p class="meta-line text-peer-paper/60">내 연결 상태</p>
          <p class="mt-2 text-lg font-semibold text-peer-paper">
            {#if hasLinkedInvite}
              연결 완료
            {:else}
              코드 연결 필요
            {/if}
          </p>
        </div>
        <div class="rounded-[20px] border border-white/10 bg-white/10 p-4">
          <p class="meta-line text-peer-paper/60">운영 상태</p>
          <p class="mt-2 text-lg font-semibold text-peer-paper">
            {#if invitesEnabled}
              활성화됨
            {:else}
              비활성화됨
            {/if}
          </p>
        </div>
      </div>
    </aside>
  </section>

  {#if invitesEnabled && redeemedInvite}
    <section class="section-shell space-y-4">
      <div class="space-y-1">
        <p class="section-kicker">내가 초대한 사람</p>
        <h2 class="headline-balance text-3xl">내가 초대를 받은 곳</h2>
      </div>
      <div class="surface-panel-muted grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div class="space-y-2">
          <p class="text-sm text-peer-copySoft">
            초대한 동료:
            {#if redeemedInvite.invite.inviter}
              <span class="font-semibold text-peer-ink">
                {redeemedInvite.invite.inviter.full_name}
                {#if redeemedInvite.invite.inviter.role}
                  · {redeemedInvite.invite.inviter.role}
                {/if}
              </span>
            {:else}
              <span class="font-semibold text-peer-ink">알 수 없는 동료</span>
            {/if}
          </p>
          {#if redeemedInvite.redeemed_at}
            <p class="text-sm text-peer-copySoft">
              연결 시점: {new Date(redeemedInvite.redeemed_at).toLocaleString('ko-KR')}
            </p>
          {/if}
        </div>
        {#if redeemedInvite.invite.inviter_user_id}
          <a class="btn btn-primary" href={`/members/${redeemedInvite.invite.inviter_user_id}`}>
            추천 남기러 가기
          </a>
        {/if}
      </div>
    </section>
  {:else if invitesEnabled}
    <section class="section-shell space-y-5">
      <div class="space-y-1">
        <p class="section-kicker">코드 연결</p>
        <h2 class="headline-balance text-3xl">초대 코드를 연결해 네트워크를 활성화하세요</h2>
        <p class="section-copy">
          초대받은 코드 1개를 입력하면 커뮤니티 이용이 활성화되고, 초대권도 사용할 수 있게 됩니다.
        </p>
      </div>

      <form
        method="post"
        action="?/redeem"
        class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]"
        onsubmit={handleRedeemSubmit}
      >
        <label class="flex flex-col gap-2 text-sm font-medium text-peer-copy">
          <span>초대 코드</span>
          <input
            name="code"
            type="text"
            placeholder="예: AB12CD34"
            required
            minlength={6}
            maxlength={16}
            class="field-shell max-w-md"
          />
        </label>
        <div class="flex items-end">
          <button type="submit" class="btn btn-primary" disabled={redeemSubmitting}>
            {#if redeemSubmitting}
              연결 중…
            {:else}
              코드 연결하기
            {/if}
          </button>
        </div>
      </form>

      {#if redeemError}
        <p class="text-sm font-medium text-peer-danger" role="alert">{redeemError}</p>
      {/if}
    </section>
  {/if}

  {#if invitesEnabled}
    <section class="section-shell space-y-6">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div class="space-y-1">
          <p class="section-kicker">초대권 현황</p>
          <h2 class="headline-balance text-3xl">나의 초대권</h2>
          <p class="section-copy">
            카드별 상태와 공유 링크, 실제로 합류한 동료까지 한 번에 확인할 수 있습니다.
          </p>
        </div>
        {#if generateError}
          <p class="text-sm font-medium text-peer-danger" role="alert">{generateError}</p>
        {/if}
      </div>

      <ul class="grid gap-4 md:grid-cols-2">
        {#each currentCards as card (card.slot.index)}
          <li>
            <article
              class={`flex h-full flex-col gap-4 rounded-[24px] border p-5 shadow-panel transition ${
                card.invite
                  ? card.state === 'fulfilled'
                    ? 'border-peer-stone bg-peer-paperAlt text-peer-copy'
                    : card.state === 'unlimited'
                      ? 'border-peer-amber/40 bg-white text-peer-ink'
                      : 'border-peer-stone bg-white text-peer-ink'
                  : 'border-dashed border-peer-stoneDark bg-white text-peer-ink'
              }`}
            >
              <header class="space-y-2">
                <div class="flex items-center justify-between gap-3">
                  <h3 class="text-xl font-semibold">{card.slot.title}</h3>
                  <span
                    class={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                      card.state === 'fulfilled'
                        ? 'bg-peer-paper text-peer-copySoft'
                        : card.state === 'unlimited'
                          ? 'bg-peer-amberSoft text-peer-amber'
                          : card.invite
                            ? 'bg-peer-forestSoft text-peer-forest'
                            : 'bg-peer-paperAlt text-peer-copySoft'
                    }`}
                  >
                    {slotLabel(card)}
                  </span>
                </div>
                <p class="text-sm text-peer-copySoft">{card.slot.description}</p>
              </header>

              {#if card.invite}
                {@const shareUrl = shareUrlFor(card.invite.code)}

                <button
                  type="button"
                  class="surface-panel-muted flex items-center justify-between text-left hover:border-peer-stoneDark"
                  onclick={() => toggleCard(card.slot.index)}
                >
                  <div>
                    <p class="text-sm font-semibold text-peer-ink">
                      {card.state === 'fulfilled' ? '사용 내역 보기' : '초대 코드와 링크 보기'}
                    </p>
                    <p class="text-xs text-peer-copyMuted">
                      {isExpanded(card.slot.index) ? '접기' : '펼쳐서 확인하기'}
                    </p>
                  </div>
                  <span class="text-sm text-peer-copyMuted">
                    {isExpanded(card.slot.index) ? '▲' : '▼'}
                  </span>
                </button>

                {#if isExpanded(card.slot.index)}
                  <section
                    class="space-y-4 rounded-[20px] border border-peer-stone bg-peer-paperAlt p-4"
                  >
                    <div class="space-y-2">
                      <p class="meta-line">초대 코드</p>
                      <p
                        class="rounded-[18px] bg-peer-ink px-4 py-3 text-lg font-semibold text-peer-paper"
                      >
                        {card.invite.code}
                      </p>
                    </div>

                    {#if shareUrl}
                      <div class="space-y-2">
                        <p class="meta-line">공유 링크</p>
                        <div class="flex flex-wrap items-center gap-2">
                          <input
                            class="field-shell flex-1 min-w-[220px] bg-white"
                            type="text"
                            readonly
                            value={shareUrl}
                          />
                          <button
                            type="button"
                            class="btn btn-secondary px-4 py-2 text-xs"
                            onclick={() => copyShareLink(card.slot.index, shareUrl)}
                            disabled={card.state === 'fulfilled'}
                          >
                            <Copy class="h-3.5 w-3.5" />
                            <span>복사</span>
                          </button>
                        </div>
                        {#if copiedSlot === card.slot.index && card.state !== 'fulfilled'}
                          <p class="text-xs font-semibold text-peer-success">
                            링크를 복사했습니다.
                          </p>
                        {/if}
                        {#if copyErrorSlot === card.slot.index}
                          <p class="text-xs font-semibold text-peer-danger">
                            복사에 실패했어요. 링크를 직접 선택해 주세요.
                          </p>
                        {/if}
                      </div>
                    {/if}

                    <div class="space-y-2">
                      <p class="meta-line">사용 현황</p>
                      {#if card.state === 'unlimited'}
                        <p
                          class="rounded-[18px] bg-peer-amberSoft px-3 py-2 text-xs font-semibold text-peer-amber"
                        >
                          총 {card.redemptionCount}명의 멤버에게 공유되었습니다.
                        </p>
                      {:else}
                        <p
                          class="rounded-[18px] bg-white px-3 py-2 text-xs font-semibold text-peer-copy"
                        >
                          사용 {card.redemptionCount}/{card.invite.max_redemptions ?? 1}회
                        </p>
                      {/if}
                    </div>

                    {#if card.redemptionCount > 0}
                      <div class="space-y-2">
                        <p class="meta-line">초대한 동료</p>
                        <ul class="space-y-2">
                          {#each card.redemptions as redemption}
                            <li class="surface-panel-muted">
                              <div class="font-semibold text-peer-ink">
                                {redemption.invitee?.full_name ?? '알 수 없는 동료'}
                                {#if redemption.invitee?.role}
                                  <span class="text-[10px] text-peer-copyMuted">
                                    · {redemption.invitee.role}
                                  </span>
                                {/if}
                              </div>
                              <time
                                class="mt-1 block text-[10px] text-peer-copyMuted"
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
                <section
                  class="space-y-3 rounded-[20px] border border-dashed border-peer-stoneDark bg-peer-paperAlt p-4"
                >
                  <p class="text-sm text-peer-copySoft">
                    이 초대권을 활성화하면 새로운 동료를 초대할 수 있는 코드와 링크가 생성됩니다.
                  </p>
                  <form
                    method="post"
                    action="?/generate"
                    class="space-y-2"
                    onsubmit={() => handleGenerateSubmit(card.slot.index)}
                  >
                    <input type="hidden" name="slot" value={card.slot.index} />
                    <button
                      type="submit"
                      class="btn btn-primary w-full"
                      disabled={!hasLinkedInvite || generateSubmittingSlot === card.slot.index}
                    >
                      {#if generateSubmittingSlot === card.slot.index}
                        생성 중…
                      {:else}
                        초대권 활성화하기
                      {/if}
                    </button>
                    {#if !hasLinkedInvite}
                      <p class="text-xs font-medium text-peer-copyMuted">
                        먼저 초대 코드를 연결하면 초대권을 사용할 수 있습니다.
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

    <section class="section-shell space-y-6">
      <div class="space-y-1">
        <p class="section-kicker">비회원 추천</p>
        <h2 class="headline-balance text-3xl">비회원 추천 링크</h2>
        <p class="section-copy">
          링크만 전달하면 상대는 가입 후 추천서를 받을 수 있습니다. 연락처를 모르는 상황에서도
          추천과 초대를 함께 시작할 수 있습니다.
        </p>
      </div>

      {#if externalClaimStatusMessage}
        <p
          class="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
          role="status"
        >
          {externalClaimStatusMessage}
        </p>
      {/if}

      <div class="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <section class="surface-panel space-y-4">
          <div class="space-y-2">
            <p class="meta-line">새 링크 만들기</p>
            <h3 class="text-2xl font-semibold text-peer-ink">비회원에게 추천 링크 보내기</h3>
            <p class="text-sm leading-6 text-peer-copySoft">
              추천서 전문은 로그인 전 공개되지 않습니다. 링크를 받은 상대는 경고를 확인한 뒤에만
              수령을 진행할 수 있습니다.
            </p>
          </div>

          <form
            method="post"
            action="?/createExternalClaim"
            class="space-y-4"
            onsubmit={handleExternalClaimSubmit}
          >
            <label class="flex flex-col gap-2 text-sm font-medium text-peer-copy">
              <span>추천 내용 (최소 20자)</span>
              <textarea
                name="content"
                rows={7}
                required
                minlength={20}
                placeholder="함께 일한 맥락, 신뢰했던 장면, 추천하고 싶은 이유를 구체적으로 적어주세요."
                class="field-shell min-h-[200px] resize-y">{externalClaimValues.content}</textarea
              >
            </label>

            <div
              class="rounded-[20px] border border-amber-300/60 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900"
            >
              <p class="font-semibold">수신자 경고 문구</p>
              <p class="mt-2">
                링크를 받은 사람이 아니라면 진행하지 말아야 하며, 잘못 수령할 경우 추천서 회수, 연결
                해제, 서비스 이용 제한 또는 별도 통지 없는 계정 삭제 등 불이익이 있을 수 있음을
                명확히 안내합니다.
              </p>
            </div>

            {#if externalClaimError}
              <p class="text-sm font-medium text-peer-danger" role="alert">{externalClaimError}</p>
            {/if}

            <button type="submit" class="btn btn-primary" disabled={externalClaimSubmitting}>
              {#if externalClaimSubmitting}
                추천 링크 생성 중...
              {:else}
                비회원 추천 링크 만들기
              {/if}
            </button>
          </form>

          {#if createdExternalClaimToken}
            {@const createdShareUrl = externalClaimShareUrlFor(createdExternalClaimToken)}
            <div class="surface-panel-muted space-y-3">
              <div class="flex items-center gap-2">
                <Sparkles class="h-4 w-4 text-peer-indigo" />
                <p class="text-sm font-semibold text-peer-ink">방금 생성한 링크</p>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <input
                  class="field-shell flex-1 min-w-[220px] bg-white"
                  type="text"
                  readonly
                  value={createdShareUrl}
                />
                <button
                  type="button"
                  class="btn btn-secondary px-4 py-2 text-xs"
                  onclick={() => copyExternalClaimLink('created-external-claim', createdShareUrl)}
                >
                  <Copy class="h-3.5 w-3.5" />
                  <span>복사</span>
                </button>
              </div>
              {#if copiedExternalClaimId === 'created-external-claim'}
                <p class="text-xs font-semibold text-peer-success">링크를 복사했습니다.</p>
              {/if}
              {#if copyExternalClaimErrorId === 'created-external-claim'}
                <p class="text-xs font-semibold text-peer-danger">
                  복사에 실패했어요. 링크를 직접 선택해 주세요.
                </p>
              {/if}
            </div>
          {/if}
        </section>

        <section class="surface-panel space-y-4">
          <div class="space-y-2">
            <p class="meta-line">생성한 링크</p>
            <h3 class="text-2xl font-semibold text-peer-ink">외부 추천 링크 목록</h3>
            <p class="text-sm leading-6 text-peer-copySoft">
              보안상 추천 링크 원문은 생성 직후에만 다시 보여줍니다. 기존 링크는 상태 확인과 철회만
              지원합니다.
            </p>
          </div>

          {#if currentExternalClaims.length === 0}
            <div class="empty-panel">
              아직 생성한 비회원 추천 링크가 없습니다. 첫 링크를 만들어 공유해보세요.
            </div>
          {:else}
            <div class="space-y-4">
              {#each currentExternalClaims as claim}
                <article class="rounded-[20px] border border-peer-stone bg-peer-paperAlt p-4">
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="space-y-1">
                      <p class="meta-line">
                        생성일 {new Date(claim.createdAt).toLocaleDateString('ko-KR')}
                      </p>
                      <p class="text-sm leading-6 text-peer-ink">{claim.content}</p>
                    </div>
                    <span
                      class={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                        claim.state === 'claimed'
                          ? 'bg-peer-forestSoft text-peer-forest'
                          : claim.state === 'revoked'
                            ? 'bg-peer-paper text-peer-copySoft'
                            : claim.state === 'expired'
                              ? 'bg-peer-amberSoft text-peer-amber'
                              : 'bg-peer-indigo/10 text-peer-indigo'
                      }`}
                    >
                      {externalClaimStateLabel(claim.state)}
                    </span>
                  </div>

                  <div class="mt-4 space-y-2">
                    <p class="meta-line">링크 상태</p>
                    <p class="text-sm leading-6 text-peer-copySoft">
                      {#if claim.state === 'active'}
                        생성 직후 복사한 링크를 사용 중입니다. 다시 전달해야 하면 현재 링크를
                        철회하고 새 링크를 만들어 주세요.
                      {:else if claim.state === 'claimed'}
                        이 링크는 이미 수령 완료되어 다시 사용할 수 없습니다.
                      {:else if claim.state === 'revoked'}
                        작성자가 이 링크를 철회했습니다.
                      {:else}
                        이 링크는 만료되어 더 이상 사용할 수 없습니다.
                      {/if}
                    </p>
                  </div>

                  <div
                    class="mt-4 flex flex-wrap items-end justify-between gap-3 text-xs text-peer-copyMuted"
                  >
                    <div class="space-y-1">
                      <p>만료일: {new Date(claim.expiresAt).toLocaleString('ko-KR')}</p>
                      {#if claim.claimedBy}
                        <p>
                          수령자: {claim.claimedBy.full_name ?? '알 수 없는 멤버'}
                          {#if claim.claimedBy.role}
                            · {claim.claimedBy.role}
                          {/if}
                        </p>
                      {/if}
                      {#if claim.claimedAt}
                        <p>수령 시점: {new Date(claim.claimedAt).toLocaleString('ko-KR')}</p>
                      {/if}
                      {#if claim.revokedAt}
                        <p>철회 시점: {new Date(claim.revokedAt).toLocaleString('ko-KR')}</p>
                      {/if}
                    </div>

                    {#if claim.state === 'active'}
                      <form
                        method="post"
                        action="?/revokeExternalClaim"
                        onsubmit={() => handleExternalClaimRevoke(claim.id)}
                      >
                        <input type="hidden" name="claimId" value={claim.id} />
                        <button
                          type="submit"
                          class="btn btn-secondary"
                          disabled={revokeSubmittingId === claim.id}
                        >
                          {#if revokeSubmittingId === claim.id}
                            철회 중...
                          {:else}
                            링크 철회
                          {/if}
                        </button>
                      </form>
                    {/if}
                  </div>
                </article>
              {/each}
            </div>
          {/if}
        </section>
      </div>
    </section>
  {/if}
</main>
