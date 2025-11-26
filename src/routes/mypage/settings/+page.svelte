<script lang="ts">
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

<main class="mx-auto flex w-full max-w-4xl flex-col gap-8 px-5 pb-16 pt-14 sm:px-8">
  <section class="glass-panel space-y-4">
    <header class="space-y-2">
      <div class="inline-flex items-center gap-2">
        <h1 class="text-3xl font-semibold text-peer-navy">설정하기</h1>
        <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500"
          >계정</span
        >
      </div>
      <p class="text-sm text-slate-600">
        알림과 계정 상태를 관리할 수 있습니다. 모든 알림은 기본적으로 활성화되어 있어요.
      </p>
      {#if loadError}
        <p class="text-sm font-semibold text-rose-500" role="alert">{loadError}</p>
      {/if}
      {#if !preferencesAvailable}
        <p
          class="rounded-2xl border border-dashed border-amber-300/70 bg-amber-50/90 px-4 py-3 text-sm text-amber-700"
        >
          알림 설정 컬럼이 아직 데이터베이스에 준비되지 않았습니다. `profiles` 테이블에
          `notify_endorsements`, `notify_gatherings`, `notify_comments` 컬럼을 `boolean` 기본값
          `true`로 추가해주세요.
        </p>
      {/if}
    </header>

    <form
      method="post"
      action="?/updatePreferences"
      class="space-y-6"
      onsubmit={handlePreferencesSubmit}
    >
      <fieldset class="space-y-5" disabled={!preferencesAvailable}>
        <legend class="text-lg font-semibold text-peer-navy">이메일 알림</legend>

        <label
          class="flex items-start gap-4 rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-4 transition focus-within:border-peer-indigo/70 focus-within:ring-2 focus-within:ring-peer-indigo/20"
        >
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
            <span class="block text-sm font-semibold text-peer-navy">동료 추천 알림</span>
            <span class="block text-xs text-slate-500"
              >누군가 나에게 추천서를 작성하면 이메일로 알려드려요.</span
            >
          </div>
        </label>

        <label
          class="flex items-start gap-4 rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-4 transition focus-within:border-peer-indigo/70 focus-within:ring-2 focus-within:ring-peer-indigo/20"
        >
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
            <span class="block text-sm font-semibold text-peer-navy">모임 라운지 새 글</span>
            <span class="block text-xs text-slate-500"
              >새로운 모임이 올라오면 놓치지 않도록 이메일로 안내해요.</span
            >
          </div>
        </label>

        <label
          class="flex items-start gap-4 rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-4 transition focus-within:border-peer-indigo/70 focus-within:ring-2 focus-within:ring-peer-indigo/20"
        >
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
            <span class="block text-sm font-semibold text-peer-navy">댓글 알림</span>
            <span class="block text-xs text-slate-500"
              >내 글이나 추천에 댓글이 달리면 이메일로 알려드릴게요.</span
            >
          </div>
        </label>
      </fieldset>

      {#if updateSucceeded && updateMessage}
        <p class="text-sm font-semibold text-peer-indigo" role="status">{updateMessage}</p>
      {/if}
      {#if updateError}
        <p class="text-sm font-semibold text-rose-500" role="alert">{updateError}</p>
      {/if}

      <div class="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          class="btn btn-primary"
          disabled={!preferencesAvailable || preferencesSubmitting}
        >
          {#if preferencesSubmitting}
            <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
                fill="none"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            <span>저장 중…</span>
          {:else}
            알림 설정 저장
          {/if}
        </button>
      </div>
    </form>
  </section>

  <section class="glass-panel space-y-5 border-rose-200/70">
    <header class="space-y-2">
      <h2 class="text-2xl font-semibold text-rose-600">회원 탈퇴</h2>
      <p class="text-sm text-rose-500">
        탈퇴 시 프로필, 추천 기록, 초대 정보가 모두 삭제되며 복구할 수 없습니다. 다시 서비스를
        이용하려면 새로 초대받아야 해요.
      </p>
    </header>

    {#if !adminClientAvailable}
      <p
        class="rounded-2xl border border-dashed border-amber-300/70 bg-amber-50/90 px-4 py-3 text-sm text-amber-700"
      >
        현재 서버가 Supabase 서비스 키 없이 실행 중이라 탈퇴 요청을 완료할 수 없어요.
        SUPABASE_SERVICE_ROLE_KEY를 설정한 뒤 다시 시도해주세요.
      </p>
    {/if}

    {#if deleteError}
      <p class="text-sm font-semibold text-rose-500" role="alert">{deleteError}</p>
    {/if}

    <form method="post" action="?/deleteAccount" onsubmit={handleDeleteSubmit}>
      <button
        type="submit"
        class="btn btn-secondary text-rose-600 hover:text-rose-700"
        disabled={!adminClientAvailable || deleteSubmitting}
      >
        {#if deleteSubmitting}
          <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
              fill="none"
            />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <span>탈퇴 중…</span>
        {:else}
          회원 탈퇴하기
        {/if}
      </button>
    </form>
  </section>
</main>
