<script lang="ts">
  import { browser } from '$app/environment';
  import { enhance } from '$app/forms';
  import { onDestroy } from 'svelte';
  import MetaTags from '$lib/components/MetaTags.svelte';
  import type { ActionData, PageData } from './$types';

  type ProfileActionData = ActionData & { firstCompletion?: boolean };

  const { data, form } = $props<{ data: PageData; form: ProfileActionData }>();

  const { profile, session, loadError } = data;
  const invite = $derived(data.invite ?? null);

  const initialValues = {
    full_name: profile?.full_name ?? session?.user.user_metadata.full_name ?? '',
    role: profile?.role ?? session?.user.user_metadata.title ?? '',
    career_history: profile?.career_history ?? '',
    introduction: profile?.introduction ?? '',
    contact_linkedin: profile?.contact_linkedin ?? '',
    contact_github: profile?.contact_github ?? '',
    contact_email: profile?.contact_email ?? ''
  };

  const submitSucceeded = $derived(form?.success ?? false);
  const fieldError = (field: keyof typeof initialValues) => form?.errors?.[field] ?? null;
  let showProfileCompleteModal = $state(false);
  let handledForm: ProfileActionData | null = null;
  let profileSubmitting = $state(false);

  // Local state for form fields with two-way binding
  let full_name = $state(initialValues.full_name);
  let role = $state(initialValues.role);
  let career_history = $state(initialValues.career_history);
  let introduction = $state(initialValues.introduction);
  let contact_linkedin = $state(initialValues.contact_linkedin);
  let contact_github = $state(initialValues.contact_github);
  let contact_email = $state(initialValues.contact_email);

  // Update local state when form values change (e.g., after validation errors)
  $effect(() => {
    if (form?.values) {
      full_name = form.values.full_name ?? initialValues.full_name;
      role = form.values.role ?? initialValues.role;
      career_history = form.values.career_history ?? initialValues.career_history;
      introduction = form.values.introduction ?? initialValues.introduction;
      contact_linkedin = form.values.contact_linkedin ?? initialValues.contact_linkedin;
      contact_github = form.values.contact_github ?? initialValues.contact_github;
      contact_email = form.values.contact_email ?? initialValues.contact_email;
    }
  });

  $effect(() => {
    if (!invite?.inviter_user_id) {
      profileSubmitting = false;
      showProfileCompleteModal = false;
      return;
    }

    if (!form) {
      handledForm = null;
      profileSubmitting = false;
      showProfileCompleteModal = false;
      return;
    }

    if (form !== handledForm) {
      handledForm = form;
      // profileSubmitting is handled by enhance now, but we ensure it's false here too just in case
      if (form) {
        profileSubmitting = false;
      }
      showProfileCompleteModal = Boolean(form.success && form.firstCompletion);
    }
  });
</script>

<MetaTags
  title="프로필 설정 · Peer Connect"
  description="나의 역할과 경험을 정리하고 동료에게 신뢰받는 프로필을 완성하세요."
  path="/profile"
  type="website"
/>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-6 px-5 pb-16 pt-14 sm:px-8">
  <section class="glass-panel space-y-4">
    <h1 class="text-3xl font-semibold text-peer-navy">프로필 설정</h1>
    <p class="text-slate-600">
      프로필을 정리해 두면 초대한 동료에게 더 잘 소개할 수 있어요. 최신 정보를 입력해 두면 추천서와
      함께 나를 표현하기 좋아요.
    </p>
    {#if loadError}
      <p class="text-sm font-semibold text-rose-500" role="alert">{loadError}</p>
    {:else if submitSucceeded}
      <p class="text-sm font-semibold text-peer-indigo" role="status">
        프로필이 업데이트되었습니다.
      </p>
    {/if}
  </section>

  <form
    method="post"
    class="glass-panel space-y-6"
    enctype="multipart/form-data"
    use:enhance={() => {
      profileSubmitting = true;
      return async ({ update }) => {
        await update();
        profileSubmitting = false;
      };
    }}
  >
    <fieldset class="grid gap-5 sm:grid-cols-2">
      <label class="flex flex-col gap-2 text-sm font-semibold text-slate-700">
        <span>이름 <span class="text-rose-500">*</span></span>
        <input
          name="full_name"
          type="text"
          placeholder="예: 김소연"
          required
          bind:value={full_name}
          autocomplete="name"
          class="w-full rounded-2xl border border-slate-300/60 bg-slate-50/90 px-4 py-3 text-sm text-peer-navy shadow-sm transition focus:border-peer-indigo focus:bg-white focus:outline-none focus:ring-2 focus:ring-peer-indigo/30"
        />
        {#if fieldError('full_name')}
          <span class="text-sm font-medium text-rose-500">{fieldError('full_name')}</span>
        {/if}
      </label>

      <label class="flex flex-col gap-2 text-sm font-semibold text-slate-700">
        <span>직군 · 포지션 <span class="text-rose-500">*</span></span>
        <input
          name="role"
          type="text"
          placeholder="예: Senior Backend Engineer · Platform Squad"
          required
          bind:value={role}
          autocomplete="organization-title"
          class="w-full rounded-2xl border border-slate-300/60 bg-slate-50/90 px-4 py-3 text-sm text-peer-navy shadow-sm transition focus:border-peer-indigo focus:bg-white focus:outline-none focus:ring-2 focus:ring-peer-indigo/30"
        />
        {#if fieldError('role')}
          <span class="text-sm font-medium text-rose-500">{fieldError('role')}</span>
        {/if}
      </label>

      <label class="sm:col-span-2 flex flex-col gap-2 text-sm font-semibold text-slate-700">
        <span>커리어 주요 이력 및 교육</span>
        <textarea
          name="career_history"
          rows={5}
          placeholder={`회사 · 팀 · 기간을 줄바꿈으로 정리해주세요.
예) 토스 · Platform Squad (2022-현재)
네이버 · Search Infra (2018-2022)`}
          bind:value={career_history}
          class="min-h-[160px] w-full rounded-2xl border border-slate-300/60 bg-slate-50/90 px-4 py-3 text-sm text-peer-navy shadow-sm transition focus:border-peer-indigo focus:bg-white focus:outline-none focus:ring-2 focus:ring-peer-indigo/30"
        ></textarea>
      </label>

      <label class="sm:col-span-2 flex flex-col gap-2 text-sm font-semibold text-slate-700">
        <span>소개 <span class="text-rose-500">*</span></span>
        <textarea
          name="introduction"
          rows={6}
          placeholder="어떤 문제를 좋아하고, 어떻게 팀과 함께 성장했는지 자유롭게 작성해주세요."
          required
          bind:value={introduction}
          class="min-h-[180px] w-full rounded-2xl border border-slate-300/60 bg-slate-50/90 px-4 py-3 text-sm text-peer-navy shadow-sm transition focus:border-peer-indigo focus:bg-white focus:outline-none focus:ring-2 focus:ring-peer-indigo/30"
        ></textarea>
        {#if fieldError('introduction')}
          <span class="text-sm font-medium text-rose-500">{fieldError('introduction')}</span>
        {/if}
      </label>

      <div class="sm:col-span-2 space-y-3">
        <div class="space-y-1">
          <h3 class="text-sm font-semibold text-slate-700">연락망</h3>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            <span>LinkedIn</span>
            <input
              name="contact_linkedin"
              type="url"
              placeholder="https://www.linkedin.com/in/username"
              bind:value={contact_linkedin}
              class="w-full rounded-2xl border border-slate-300/60 bg-slate-50/90 px-4 py-3 text-sm text-peer-navy shadow-sm transition focus:border-peer-indigo focus:bg-white focus:outline-none focus:ring-2 focus:ring-peer-indigo/30"
            />
            {#if fieldError('contact_linkedin')}
              <span class="text-sm font-medium text-rose-500">{fieldError('contact_linkedin')}</span
              >
            {/if}
          </label>

          <label class="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            <span>GitHub</span>
            <input
              name="contact_github"
              type="url"
              placeholder="https://github.com/username"
              bind:value={contact_github}
              class="w-full rounded-2xl border border-slate-300/60 bg-slate-50/90 px-4 py-3 text-sm text-peer-navy shadow-sm transition focus:border-peer-indigo focus:bg-white focus:outline-none focus:ring-2 focus:ring-peer-indigo/30"
            />
            {#if fieldError('contact_github')}
              <span class="text-sm font-medium text-rose-500">{fieldError('contact_github')}</span>
            {/if}
          </label>

          <label class="sm:col-span-2 flex flex-col gap-2 text-sm font-semibold text-slate-700">
            <span>이메일</span>
            <input
              name="contact_email"
              type="email"
              placeholder="peerconnect@example.com"
              bind:value={contact_email}
              class="w-full rounded-2xl border border-slate-300/60 bg-slate-50/90 px-4 py-3 text-sm text-peer-navy shadow-sm transition focus:border-peer-indigo focus:bg-white focus:outline-none focus:ring-2 focus:ring-peer-indigo/30"
            />
            {#if fieldError('contact_email')}
              <span class="text-sm font-medium text-rose-500">{fieldError('contact_email')}</span>
            {/if}
          </label>
        </div>
      </div>
    </fieldset>

    {#if form?.serverMessage}
      <p class="text-sm font-semibold text-rose-500" role="alert">{form.serverMessage}</p>
    {/if}

    <div class="flex flex-wrap items-center gap-3">
      <button type="submit" class="btn btn-primary" disabled={profileSubmitting}>
        {#if profileSubmitting}
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
          <span>저장 중…</span>
        {:else}
          프로필 저장
        {/if}
      </button>
      <a class="btn btn-secondary" href="/">홈으로 돌아가기</a>
    </div>
  </form>
</main>

{#if showProfileCompleteModal && invite?.inviter_user_id}
  <div class="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/60 px-5">
    <div
      class="w-full max-w-md rounded-3xl border border-slate-200/70 bg-white p-8 text-center shadow-2xl"
    >
      <p class="text-lg font-semibold text-peer-navy">나를 초대한 동료에게 추천서를 남겨볼까요?</p>
      <p class="mt-3 text-sm text-slate-600">
        초대한 동료에게 감사의 마음을 추천서로 전해보세요. 짧은 경험이라도 괜찮아요!
      </p>
      <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
        <a
          class="btn btn-primary"
          href={`/members/${invite.inviter_user_id}?endorsementStatus=prompt`}
        >
          예
        </a>
        <button
          type="button"
          class="btn btn-secondary"
          onclick={() => (showProfileCompleteModal = false)}
        >
          아니오
        </button>
      </div>
    </div>
  </div>
{/if}
