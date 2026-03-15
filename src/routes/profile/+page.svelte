<script lang="ts">
  import { enhance } from '$app/forms';
  import { BadgeCheck, Link2, NotebookPen, UserRound } from 'lucide-svelte';
  import MetaTags from '$lib/components/MetaTags.svelte';
  import type { ActionData, PageData } from './$types';

  type ProfileActionData = ActionData & { firstCompletion?: boolean };

  const { data, form } = $props<{ data: PageData; form: ProfileActionData }>();

  const { profile, session, loadError } = data;
  const invite = $derived(data.invite ?? null);
  const defaultAvatar = '/images/default-profile.svg';

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

  let full_name = $state(initialValues.full_name);
  let role = $state(initialValues.role);
  let career_history = $state(initialValues.career_history);
  let introduction = $state(initialValues.introduction);
  let contact_linkedin = $state(initialValues.contact_linkedin);
  let contact_github = $state(initialValues.contact_github);
  let contact_email = $state(initialValues.contact_email);

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
      profileSubmitting = false;
      showProfileCompleteModal = Boolean(form.success && form.firstCompletion);
    }
  });

  const completion = $derived.by(() => {
    const checkpoints = [
      full_name.trim().length > 0,
      role.trim().length > 0,
      introduction.trim().length > 0,
      career_history.trim().length > 0,
      Boolean(contact_linkedin.trim() || contact_github.trim() || contact_email.trim())
    ];

    return Math.round((checkpoints.filter(Boolean).length / checkpoints.length) * 100);
  });

  const previewTags = $derived.by(() =>
    role
      .split(/[·,/]/)
      .map((token: string) => token.trim())
      .filter(Boolean)
      .slice(0, 3)
  );

  const careerLines = $derived.by(() =>
    career_history
      .split('\n')
      .map((line: string) => line.trim())
      .filter(Boolean)
      .slice(0, 4)
  );

  const contactPreview = $derived.by(() =>
    [
      { label: 'LinkedIn', value: contact_linkedin.trim() },
      { label: 'GitHub', value: contact_github.trim() },
      { label: 'Email', value: contact_email.trim() }
    ].filter((item) => item.value.length > 0)
  );
</script>

<MetaTags
  title="프로필 설정 · Peer Connect"
  description="나의 역할과 경험을 정리하고 동료에게 신뢰받는 프로필을 완성하세요."
  path="/profile"
  type="website"
/>

<main class="page-shell">
  <section class="surface-panel-strong grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
    <div class="space-y-5">
      <p class="section-kicker text-peer-paper/70">프로필 편집</p>
      <div class="space-y-3">
        <h1 class="headline-balance max-w-3xl text-4xl leading-[1.05] text-peer-paper sm:text-5xl">
          다른 사람이 나를 더 잘 이해할 수 있는 프로필로 다듬어보세요
        </h1>
        <p class="max-w-2xl text-base leading-7 text-peer-paper/75 sm:text-lg">
          역할, 소개, 커리어, 연결 채널이 분명할수록 첫인상도 더 선명해지고, 새로운 관계도 더
          자연스럽게 시작됩니다.
        </p>
      </div>

      <div class="space-y-3">
        <div class="flex items-center justify-between gap-3 text-sm text-peer-paper/75">
          <span>프로필 완성도</span>
          <span class="font-semibold text-peer-paper">{completion}%</span>
        </div>
        <div class="h-3 overflow-hidden rounded-full bg-white/10">
          <div
            class="h-full rounded-full bg-peer-amber transition-all duration-300"
            style={`width: ${completion}%`}
          ></div>
        </div>
      </div>

      {#if loadError}
        <p
          class="rounded-[20px] border border-white/10 bg-white/10 px-4 py-3 text-sm text-peer-paper/75"
          role="alert"
        >
          {loadError}
        </p>
      {:else if submitSucceeded}
        <p
          class="rounded-[20px] border border-white/10 bg-white/10 px-4 py-3 text-sm text-peer-paper/75"
          role="status"
        >
          프로필이 업데이트되었습니다.
        </p>
      {/if}
    </div>

    <aside class="rounded-[24px] border border-white/10 bg-white/10 p-5">
      <div class="flex items-center gap-4">
        <img
          class="h-16 w-16 rounded-[20px] border border-white/10 bg-white/10 object-cover"
          src={profile?.photo_url ?? defaultAvatar}
          alt="내 프로필 이미지"
        />
        <div class="space-y-1">
          <p class="meta-line text-peer-paper/55">미리보기</p>
          <h2 class="text-2xl text-peer-paper">{full_name || '이름을 입력해보세요'}</h2>
          <p class="text-sm text-peer-paper/70">{role || '직군 · 포지션을 입력해보세요'}</p>
        </div>
      </div>

      <div class="mt-5 space-y-4">
        <div class="flex flex-wrap gap-2">
          {#if previewTags.length > 0}
            {#each previewTags as tag}
              <span
                class="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-peer-paper"
              >
                {tag}
              </span>
            {/each}
          {:else}
            <span
              class="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-peer-paper/65"
            >
              역할 태그가 여기에 표시됩니다
            </span>
          {/if}
        </div>

        <div class="space-y-2">
          <p class="meta-line text-peer-paper/55">소개 미리보기</p>
          <p class="text-sm leading-7 text-peer-paper/75">
            {introduction.trim() ||
              '어떤 문제를 좋아하고, 어떻게 협업하는지 적어두면 더 잘 읽힙니다.'}
          </p>
        </div>

        <div class="space-y-2">
          <p class="meta-line text-peer-paper/55">커리어 미리보기</p>
          {#if careerLines.length > 0}
            <ul class="space-y-2">
              {#each careerLines as line}
                <li class="text-sm text-peer-paper/75">{line}</li>
              {/each}
            </ul>
          {:else}
            <p class="text-sm text-peer-paper/65">커리어 줄바꿈 목록이 여기에 표시됩니다.</p>
          {/if}
        </div>
      </div>
    </aside>
  </section>

  <div class="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
    <form
      method="post"
      class="section-shell space-y-8"
      enctype="multipart/form-data"
      use:enhance={() => {
        profileSubmitting = true;
        return async ({ update }) => {
          await update();
          profileSubmitting = false;
        };
      }}
    >
      <section class="space-y-4">
        <div class="flex items-center gap-3">
          <div
            class="inline-flex h-11 w-11 items-center justify-center rounded-[18px] bg-peer-paperAlt text-peer-forest"
          >
            <UserRound class="h-5 w-5" />
          </div>
          <div>
            <p class="section-kicker">1단계</p>
            <h2 class="headline-balance text-2xl">기본 정보</h2>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <label class="flex flex-col gap-2 text-sm font-medium text-peer-copy">
            <span>이름 <span class="text-peer-danger">*</span></span>
            <input
              name="full_name"
              type="text"
              placeholder="예: 김소연"
              required
              bind:value={full_name}
              autocomplete="name"
              class="field-shell"
            />
            {#if fieldError('full_name')}
              <span class="text-sm font-medium text-peer-danger">{fieldError('full_name')}</span>
            {/if}
          </label>

          <label class="flex flex-col gap-2 text-sm font-medium text-peer-copy">
            <span>직군 · 포지션 <span class="text-peer-danger">*</span></span>
            <input
              name="role"
              type="text"
              placeholder="예: Senior Backend Engineer · Platform Squad"
              required
              bind:value={role}
              autocomplete="organization-title"
              class="field-shell"
            />
            {#if fieldError('role')}
              <span class="text-sm font-medium text-peer-danger">{fieldError('role')}</span>
            {/if}
          </label>
        </div>
      </section>

      <section class="space-y-4 border-t border-peer-stone pt-8">
        <div class="flex items-center gap-3">
          <div
            class="inline-flex h-11 w-11 items-center justify-center rounded-[18px] bg-peer-paperAlt text-peer-amber"
          >
            <NotebookPen class="h-5 w-5" />
          </div>
          <div>
            <p class="section-kicker">2단계</p>
            <h2 class="headline-balance text-2xl">소개와 커리어</h2>
          </div>
        </div>

        <label class="flex flex-col gap-2 text-sm font-medium text-peer-copy">
          <span>커리어 주요 이력 및 교육</span>
          <textarea
            name="career_history"
            rows={5}
            placeholder={`회사 · 팀 · 기간을 줄바꿈으로 정리해주세요.
예) 토스 · Platform Squad (2022-현재)
네이버 · Search Infra (2018-2022)`}
            bind:value={career_history}
            class="field-shell min-h-[168px]"
          ></textarea>
        </label>

        <label class="flex flex-col gap-2 text-sm font-medium text-peer-copy">
          <span>소개 <span class="text-peer-danger">*</span></span>
          <textarea
            name="introduction"
            rows={6}
            placeholder="어떤 문제를 좋아하고, 어떻게 팀과 함께 성장했는지 자유롭게 작성해주세요."
            required
            bind:value={introduction}
            class="field-shell min-h-[200px]"
          ></textarea>
          <span class="text-xs text-peer-copyMuted">
            함께 일할 때 어떤 장점이 드러나는지 구체적으로 적을수록 좋습니다.
          </span>
          {#if fieldError('introduction')}
            <span class="text-sm font-medium text-peer-danger">{fieldError('introduction')}</span>
          {/if}
        </label>
      </section>

      <section class="space-y-4 border-t border-peer-stone pt-8">
        <div class="flex items-center gap-3">
          <div
            class="inline-flex h-11 w-11 items-center justify-center rounded-[18px] bg-peer-paperAlt text-peer-forest"
          >
            <Link2 class="h-5 w-5" />
          </div>
          <div>
            <p class="section-kicker">3단계</p>
            <h2 class="headline-balance text-2xl">연결 채널</h2>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <label class="flex flex-col gap-2 text-sm font-medium text-peer-copy">
            <span>LinkedIn</span>
            <input
              name="contact_linkedin"
              type="url"
              placeholder="https://www.linkedin.com/in/username"
              bind:value={contact_linkedin}
              class="field-shell"
            />
            {#if fieldError('contact_linkedin')}
              <span class="text-sm font-medium text-peer-danger"
                >{fieldError('contact_linkedin')}</span
              >
            {/if}
          </label>

          <label class="flex flex-col gap-2 text-sm font-medium text-peer-copy">
            <span>GitHub</span>
            <input
              name="contact_github"
              type="url"
              placeholder="https://github.com/username"
              bind:value={contact_github}
              class="field-shell"
            />
            {#if fieldError('contact_github')}
              <span class="text-sm font-medium text-peer-danger"
                >{fieldError('contact_github')}</span
              >
            {/if}
          </label>

          <label class="sm:col-span-2 flex flex-col gap-2 text-sm font-medium text-peer-copy">
            <span>이메일</span>
            <input
              name="contact_email"
              type="email"
              placeholder="peerconnect@example.com"
              bind:value={contact_email}
              class="field-shell"
            />
            {#if fieldError('contact_email')}
              <span class="text-sm font-medium text-peer-danger">{fieldError('contact_email')}</span
              >
            {/if}
          </label>
        </div>
      </section>

      {#if form?.serverMessage}
        <p
          class="rounded-[20px] border border-peer-danger/20 bg-peer-dangerSoft px-4 py-3 text-sm font-medium text-peer-danger"
          role="alert"
        >
          {form.serverMessage}
        </p>
      {/if}

      <div class="flex flex-wrap items-center gap-3 border-t border-peer-stone pt-6">
        <button type="submit" class="btn btn-primary" disabled={profileSubmitting}>
          {#if profileSubmitting}
            <span>저장 중...</span>
          {:else}
            프로필 저장
          {/if}
        </button>
        <a class="btn btn-secondary" href="/">홈으로 돌아가기</a>
      </div>
    </form>

    <aside class="space-y-6">
      <section class="section-shell space-y-4">
        <div class="flex items-center gap-3">
          <div
            class="inline-flex h-11 w-11 items-center justify-center rounded-[18px] bg-peer-paperAlt text-peer-amber"
          >
            <BadgeCheck class="h-5 w-5" />
          </div>
          <div>
            <p class="section-kicker">점검 포인트</p>
            <h2 class="headline-balance text-2xl">읽히는 프로필 기준</h2>
          </div>
        </div>
        <ul class="space-y-3 text-sm leading-6 text-peer-copySoft">
          <li>이름과 역할이 첫눈에 읽히는지</li>
          <li>어떤 문제를 다루는 사람인지 소개가 드러나는지</li>
          <li>커리어가 줄바꿈으로 빠르게 스캔되는지</li>
          <li>연락 가능한 채널이 최소 하나는 있는지</li>
        </ul>
      </section>

      <section class="section-shell space-y-4">
        <p class="section-kicker">연결 채널 미리보기</p>
        <h2 class="headline-balance text-2xl">연결 채널 미리보기</h2>
        {#if contactPreview.length > 0}
          <ul class="space-y-3">
            {#each contactPreview as item}
              <li class="surface-panel-muted text-sm text-peer-copy">
                <p class="meta-line">{item.label}</p>
                <p class="mt-2 break-all">{item.value}</p>
              </li>
            {/each}
          </ul>
        {:else}
          <div class="empty-panel">연결 채널을 하나 이상 입력하면 여기에 표시됩니다.</div>
        {/if}
      </section>
    </aside>
  </div>
</main>

{#if showProfileCompleteModal && invite?.inviter_user_id}
  <div class="fixed inset-0 z-30 flex items-center justify-center bg-peer-ink/55 px-5">
    <div
      class="w-full max-w-md rounded-[28px] border border-peer-stone bg-white p-8 text-center shadow-panelLg"
    >
      <p class="section-kicker">다음 단계</p>
      <h2 class="headline-balance mt-2 text-3xl">나를 초대한 동료에게 추천서를 남겨볼까요?</h2>
      <p class="mt-3 text-sm leading-7 text-peer-copySoft">
        초대한 동료에게 감사의 마음을 추천서로 전해보세요. 짧은 경험이라도 괜찮습니다.
      </p>
      <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
        <a
          class="btn btn-primary"
          href={`/members/${invite.inviter_user_id}?endorsementStatus=prompt`}
        >
          예, 추천 남길게요
        </a>
        <button
          type="button"
          class="btn btn-secondary"
          onclick={() => (showProfileCompleteModal = false)}
        >
          나중에 하기
        </button>
      </div>
    </div>
  </div>
{/if}
