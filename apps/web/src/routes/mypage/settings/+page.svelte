<script lang="ts">
  import { BellRing, Settings2, ShieldAlert } from 'lucide-svelte';
  import MetaTags from '$lib/components/MetaTags.svelte';
  import type { ActionData, PageData } from './$types';

  const { data, form } = $props<{ data: PageData; form: ActionData }>();

  const updateSucceeded = $derived(form?.success ?? false);
  const updateMessage = $derived(form?.message ?? null);
  const updateError = $derived(form?.updateError ?? null);
  const deleteError = $derived(form?.deleteError ?? null);
  const loadError = $derived(data.loadError ?? null);
  const adminClientAvailable = $derived(data.adminClientAvailable);
  const preferencesAvailable = $derived(data.preferencesAvailable);

  let handledForm: ActionData | null = null;
  let handledPreferences = data.preferences;
  let preferencesState = $state({ ...data.preferences });
  let preferencesSubmitting = $state(false);
  let deleteSubmitting = $state(false);

  $effect(() => {
    const nextForm = form ?? null;
    const nextPreferences = form?.preferences ?? data.preferences;

    if (nextForm !== handledForm || nextPreferences !== handledPreferences) {
      handledForm = nextForm;
      handledPreferences = nextPreferences;
      preferencesState = { ...nextPreferences };
      preferencesSubmitting = false;
      deleteSubmitting = false;
    }
  });

  const handlePreferencesSubmit = () => {
    preferencesSubmitting = true;
  };

  const handleDeleteSubmit = (event: SubmitEvent) => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        '정말 회원 탈퇴를 진행하시겠어요? 삭제된 데이터는 복구할 수 없습니다.'
      );
      if (!confirmed) {
        event.preventDefault();
        return;
      }
    }
    deleteSubmitting = true;
  };
</script>

<MetaTags
  title="설정하기 · Peer Connect"
  description="알림 설정과 회원 탈퇴를 관리할 수 있는 Peer Connect 설정 페이지입니다."
  path="/mypage/settings"
  type="website"
/>

<main class="page-shell">
  <section class="surface-panel-strong grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
    <div class="space-y-5">
      <p class="section-kicker text-peer-paper/70">설정</p>
      <div class="space-y-3">
        <h1 class="headline-balance max-w-3xl text-4xl leading-[1.05] text-peer-paper sm:text-5xl">
          알림과 계정 상태를 차분하게 관리하세요
        </h1>
        <p class="max-w-2xl text-base leading-7 text-peer-paper/75 sm:text-lg">
          자주 확인하는 알림은 켜두고, 불필요한 알림은 줄이세요. 계정 관련 위험 작업도 이 화면에서
          안전하게 정리할 수 있습니다.
        </p>
      </div>

      {#if loadError}
        <p
          class="rounded-[20px] border border-white/10 bg-white/10 px-4 py-3 text-sm text-peer-paper/80"
          role="alert"
        >
          {loadError}
        </p>
      {/if}

      {#if !preferencesAvailable}
        <p
          class="rounded-[20px] border border-white/10 bg-white/10 px-4 py-3 text-sm text-peer-paper/80"
        >
          알림 설정 컬럼이 아직 데이터베이스에 준비되지 않았습니다. 설정이 준비되면 이 화면에서 바로
          관리할 수 있습니다.
        </p>
      {/if}
    </div>

    <div class="space-y-4 rounded-[24px] border border-white/10 bg-white/10 p-5">
      <div class="space-y-1">
        <p class="meta-line text-peer-paper/60">설정 개요</p>
        <p class="headline-balance text-xl font-semibold text-peer-paper">
          변경 사항은 즉시 계정에 반영됩니다
        </p>
      </div>
      <div class="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
        <div class="rounded-[20px] border border-white/10 bg-white/10 p-4">
          <p class="meta-line text-peer-paper/60">알림</p>
          <p class="mt-2 text-lg font-semibold text-peer-paper">
            {preferencesAvailable ? '관리 가능' : '준비 중'}
          </p>
        </div>
        <div class="rounded-[20px] border border-white/10 bg-white/10 p-4">
          <p class="meta-line text-peer-paper/60">탈퇴</p>
          <p class="mt-2 text-lg font-semibold text-peer-paper">
            {adminClientAvailable ? '처리 가능' : '설정 필요'}
          </p>
        </div>
      </div>
    </div>
  </section>

  <section class="section-shell space-y-6">
    <div class="flex items-center gap-3">
      <div class="rounded-[18px] bg-peer-paperAlt p-3 text-peer-forest">
        <BellRing class="h-5 w-5" />
      </div>
      <div>
        <p class="section-kicker">알림 설정</p>
        <h2 class="headline-balance text-3xl">이메일 알림</h2>
      </div>
    </div>

    <form
      method="post"
      action="?/updatePreferences"
      class="space-y-5"
      onsubmit={handlePreferencesSubmit}
    >
      <fieldset class="space-y-4" disabled={!preferencesAvailable}>
        <label class="surface-panel-muted flex items-start gap-4">
          <input name="notify_endorsements" type="hidden" value="false" />
          <input
            id="notify_endorsements"
            name="notify_endorsements"
            type="checkbox"
            value="true"
            bind:checked={preferencesState.endorsements}
            class="mt-1 h-5 w-5 rounded-md border-slate-300 text-peer-indigo"
          />
          <div class="space-y-1">
            <span class="block text-sm font-semibold text-peer-ink">동료 추천 알림</span>
            <span class="block text-sm text-peer-copySoft">
              누군가 나에게 추천서를 작성하면 이메일로 알려드립니다.
            </span>
          </div>
        </label>

        <label class="surface-panel-muted flex items-start gap-4">
          <input name="notify_gatherings" type="hidden" value="false" />
          <input
            id="notify_gatherings"
            name="notify_gatherings"
            type="checkbox"
            value="true"
            bind:checked={preferencesState.gatherings}
            class="mt-1 h-5 w-5 rounded-md border-slate-300 text-peer-indigo"
          />
          <div class="space-y-1">
            <span class="block text-sm font-semibold text-peer-ink">모임 라운지 새 글</span>
            <span class="block text-sm text-peer-copySoft">
              새로운 모임이 올라오면 놓치지 않도록 이메일로 안내합니다.
            </span>
          </div>
        </label>

        <label class="surface-panel-muted flex items-start gap-4">
          <input name="notify_comments" type="hidden" value="false" />
          <input
            id="notify_comments"
            name="notify_comments"
            type="checkbox"
            value="true"
            bind:checked={preferencesState.comments}
            class="mt-1 h-5 w-5 rounded-md border-slate-300 text-peer-indigo"
          />
          <div class="space-y-1">
            <span class="block text-sm font-semibold text-peer-ink">댓글 알림</span>
            <span class="block text-sm text-peer-copySoft">
              내 글이나 추천에 댓글이 달리면 이메일로 알려드립니다.
            </span>
          </div>
        </label>
      </fieldset>

      {#if updateSucceeded && updateMessage}
        <p class="text-sm font-medium text-peer-forest" role="status">{updateMessage}</p>
      {/if}
      {#if updateError}
        <p class="text-sm font-medium text-peer-danger" role="alert">{updateError}</p>
      {/if}

      <div class="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          class="btn btn-primary"
          disabled={!preferencesAvailable || preferencesSubmitting}
        >
          {#if preferencesSubmitting}
            <span>저장 중…</span>
          {:else}
            알림 설정 저장
          {/if}
        </button>
      </div>
    </form>
  </section>

  <section class="section-shell space-y-5 border border-peer-danger/20">
    <div class="flex items-center gap-3">
      <div class="rounded-[18px] bg-peer-dangerSoft p-3 text-peer-danger">
        <ShieldAlert class="h-5 w-5" />
      </div>
      <div>
        <p class="section-kicker text-peer-danger">위험 구역</p>
        <h2 class="headline-balance text-3xl text-peer-danger">회원 탈퇴</h2>
      </div>
    </div>

    <p class="text-sm leading-7 text-peer-copySoft">
      탈퇴 시 프로필, 추천 기록, 초대 정보가 모두 삭제되며 복구할 수 없습니다. 다시 서비스를
      이용하려면 새로 초대받아야 합니다.
    </p>

    {#if !adminClientAvailable}
      <div class="empty-panel text-peer-copy">
        현재 서버가 Supabase 서비스 키 없이 실행 중이라 탈퇴 요청을 완료할 수 없습니다.
      </div>
    {/if}

    {#if deleteError}
      <p class="text-sm font-medium text-peer-danger" role="alert">{deleteError}</p>
    {/if}

    <form method="post" action="?/deleteAccount" onsubmit={handleDeleteSubmit}>
      <button
        type="submit"
        class="btn border border-peer-danger/20 bg-peer-dangerSoft text-peer-danger hover:bg-peer-dangerSoft"
        disabled={!adminClientAvailable || deleteSubmitting}
      >
        {#if deleteSubmitting}
          <span>탈퇴 처리 중…</span>
        {:else}
          회원 탈퇴하기
        {/if}
      </button>
    </form>
  </section>
</main>
