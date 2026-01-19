<script lang="ts">
  import MetaTags from '$lib/components/MetaTags.svelte';
  import { page } from '$app/stores';
  import type { ActionData, PageData } from './$types';

  const { data, form } = $props<{ data: PageData; form: ActionData }>();

  const profile = $derived(data.profile);
  const endorsements = $derived(data.endorsements);
  const existingEndorsementId = $derived(data.existingEndorsementId);
  const statusMessage = $derived(data.statusMessage);
  const loadError = $derived(data.loadError);
  const session = $derived(data.session);
  const defaultAvatar = '/images/default-profile.svg';
  const values = $derived<Record<string, string>>(form?.values ?? { content: '' });
  const contentError = $derived(form?.errors?.content ?? null);
  const serverMessage = $derived(form?.serverMessage ?? null);
  const deleteError = $derived(form?.deleteError ?? null);

  const metaTitle = $derived(
    profile ? `${profile.full_name} · Peer Connect` : '동료 프로필 · Peer Connect'
  );

  const truncate = (value: string, limit = 140) =>
    value.length > limit ? `${value.slice(0, limit)}…` : value;

  const metaDescription = $derived.by<string>(() => {
    if (profile?.introduction) {
      return truncate(profile.introduction, 160);
    }

    if (profile?.role) {
      return `${profile.full_name}님의 역할과 경험을 확인하세요. ${profile.role}`;
    }

    return 'Peer Connect 멤버 프로필을 확인하고 함께 성장할 동료를 찾아보세요.';
  });

  const metaImage = $derived(profile?.photo_url ?? '/images/og-default.svg');
  const metaPath = $derived(profile ? `/members/${profile.user_id}` : undefined);

  let handledForm: ActionData | null = null;
  let endorseSubmitting = $state(false);
  let deleteSubmittingId = $state<string | null>(null);

  $effect(() => {
    if (form !== handledForm) {
      handledForm = form ?? null;
      endorseSubmitting = false;
      deleteSubmittingId = null;
    }
  });

  const handleEndorseSubmit = () => {
    endorseSubmitting = true;
  };

  const handleDeleteSubmit = (endorsementId: string) => {
    deleteSubmittingId = endorsementId;
  };

  type ContactItem = {
    label: string;
    value: string;
    href: string;
    external: boolean;
  };

  const contactItems = $derived.by<ContactItem[]>(() => {
    if (!profile) {
      return [];
    }

    const stripProtocol = (url: string) => url.replace(/^https?:\/\//, '');
    const items: ContactItem[] = [];

    if (profile.contact_linkedin) {
      items.push({
        label: 'LinkedIn',
        value: stripProtocol(profile.contact_linkedin),
        href: profile.contact_linkedin,
        external: true
      });
    }

    if (profile.contact_github) {
      items.push({
        label: 'GitHub',
        value: stripProtocol(profile.contact_github),
        href: profile.contact_github,
        external: true
      });
    }

    if (profile.contact_email) {
      items.push({
        label: '이메일',
        value: profile.contact_email,
        href: `mailto:${profile.contact_email}`,
        external: false
      });
    }

    return items;
  });
</script>

<MetaTags
  title={metaTitle}
  description={metaDescription}
  image={metaImage}
  path={metaPath}
  type="article"
/>

{#if !profile}
  <main
    class="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 px-5 pb-16 pt-14 text-center sm:px-8"
  >
    <section class="glass-panel space-y-4">
      <h1 class="text-3xl font-semibold text-peer-navy">프로필 정보를 찾을 수 없습니다.</h1>
      <p class="text-slate-600">초대 링크가 만료되었거나 프로필이 삭제되었을 수 있어요.</p>
      <a class="btn btn-primary" href="/members">다른 동료 살펴보기</a>
    </section>
  </main>
{:else}
  <main class="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 pb-16 pt-14 sm:px-8">
    <section class="glass-panel space-y-6">
      <div class="space-y-3">
        <a
          class="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 transition hover:text-blue-700"
          href="/members"
        >
          ← 동료 프로필 둘러보기
        </a>
        <h1 class="text-3xl font-semibold text-peer-navy">{profile.full_name}</h1>
        {#if statusMessage}
          <p class="text-sm font-semibold text-peer-indigo" role="status">{statusMessage}</p>
        {/if}
        {#if loadError}
          <p class="text-sm font-semibold text-rose-500" role="alert">{loadError}</p>
        {/if}
      </div>

      <div class="grid gap-6 lg:grid-cols-[220px_1fr]">
        <div class="flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
          <img
            class="h-40 w-40 rounded-3xl border-4 border-slate-200/70 bg-slate-50 object-cover"
            src={profile.photo_url ?? defaultAvatar}
            alt={`${profile.full_name} 프로필 이미지`}
          />
          <p class="text-sm font-semibold text-slate-500">{profile.role}</p>
        </div>
        <div class="space-y-6">
          <section class="space-y-2">
            <h2 class="text-xl font-semibold text-peer-navy">소개</h2>
            <p class="text-sm leading-relaxed text-slate-600">
              {profile.introduction || '아직 소개가 작성되지 않았습니다.'}
            </p>
          </section>
          {#if contactItems.length > 0}
            <section class="space-y-3">
              <h2 class="text-xl font-semibold text-peer-navy">연락처</h2>
              <ul class="space-y-2">
                {#each contactItems as item}
                  <li>
                    <a
                      class="flex flex-col gap-1 rounded-2xl border border-slate-200/60 bg-white/85 px-4 py-3 text-sm text-peer-navy shadow-sm transition hover:-translate-y-0.5 hover:border-peer-indigo/60 hover:text-peer-indigo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peer-indigo/30"
                      href={item.href}
                      target={item.external ? '_blank' : undefined}
                      rel={item.external ? 'noopener noreferrer' : undefined}
                    >
                      <span class="text-xs font-semibold uppercase tracking-wide text-slate-400"
                        >{item.label}</span
                      >
                      <span class="break-all">{item.value}</span>
                    </a>
                  </li>
                {/each}
              </ul>
            </section>
          {/if}
          <section class="space-y-3">
            <h2 class="text-xl font-semibold text-peer-navy">커리어 및 교육</h2>
            {#if profile.career_history}
              <ul class="space-y-2">
                {#each profile.career_history.split('\n').filter(Boolean) as line}
                  <li
                    class="relative pl-5 text-sm text-slate-600 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:transform before:h-2 before:w-2 before:rounded-full before:bg-gradient-to-br before:from-peer-sky before:to-peer-indigo before:content-['']"
                  >
                    {line}
                  </li>
                {/each}
              </ul>
            {:else}
              <p class="text-sm text-slate-500">커리어 및 교육 요약이 비어 있어요.</p>
            {/if}
          </section>
        </div>
      </div>
    </section>

    <section class="glass-panel space-y-6">
      <header class="space-y-2">
        <h2 class="text-2xl font-semibold text-peer-navy">동료 추천</h2>
        <p class="text-sm text-slate-600">동료에게 진심 담긴 칭찬과 피드백을 남겨보세요.</p>
      </header>

      {#if existingEndorsementId}
        <p class="rounded-2xl bg-indigo-50/70 px-4 py-3 text-sm font-semibold text-indigo-600">
          이미 이 동료에게 추천을 남겼어요. 내용을 다시 작성하려면 아래에서 삭제 후 새로
          작성해주세요.
        </p>
      {:else if session && profile.user_id === session?.user.id}
        <p class="rounded-2xl bg-slate-100/70 px-4 py-3 text-sm text-slate-500">
          나의 프로필에는 추천을 남길 수 없어요.
        </p>
      {:else if !session}
          <div class="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 text-center space-y-3">
             <p class="text-slate-600 font-medium">로그인하고 동료에게 추천서를 남겨보세요.</p> 
             <a href={`/auth/login?next=${encodeURIComponent($page.url.pathname)}`} class="btn btn-primary inline-flex">
                 로그인하기
             </a>
          </div>
      {:else if !existingEndorsementId}
        <form method="post" action="?/endorse" class="space-y-4" onsubmit={handleEndorseSubmit}>
          <label class="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            <span>추천 내용 (최소 20자)</span>
            <textarea
              name="content"
              rows={5}
              required
              minlength={20}
              placeholder="어떤 상황에서 이 동료가 빛났는지, 함께 일하며 무엇을 배웠는지 구체적으로 작성해주세요."
              class="w-full rounded-2xl border border-slate-300/60 bg-slate-50/90 px-4 py-3 text-sm text-peer-navy shadow-sm transition focus:border-peer-indigo focus:bg-white focus:outline-none focus:ring-2 focus:ring-peer-indigo/30"
              >{values.content}</textarea
            >
          </label>
          {#if contentError}
            <p class="text-sm font-medium text-rose-500" role="alert">{contentError}</p>
          {/if}
          {#if serverMessage}
            <p class="text-sm font-semibold text-rose-500" role="alert">{serverMessage}</p>
          {/if}
          <button type="submit" class="btn btn-primary" disabled={endorseSubmitting}>
            {#if endorseSubmitting}
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
              <span>등록 중…</span>
            {:else}
              추천 남기기
            {/if}
          </button>
        </form>
      {/if}

      <section class="space-y-4">
        {#if endorsements.length === 0}
          <p
            class="rounded-2xl border border-dashed border-slate-300/70 bg-slate-100/70 px-4 py-6 text-center text-slate-500"
          >
            아직 작성된 추천이 없습니다. 첫 번째 추천을 남겨보세요!
          </p>
        {:else}
          {#each endorsements as endorsement}
            <article
              class="rounded-3xl border border-slate-200/60 bg-white/85 p-6 shadow-sm backdrop-blur"
            >
              <header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                {#if endorsement.author}
                  <a
                    class="flex items-center gap-3"
                    href={`/members/${endorsement.author.user_id ?? endorsement.author_id}`}
                  >
                    <img
                      class="h-12 w-12 rounded-full border border-slate-200/60 bg-slate-50 object-cover"
                      src={endorsement.author.photo_url ?? defaultAvatar}
                      alt={`${endorsement.author.full_name}의 프로필 이미지`}
                    />
                    <div>
                      <span class="block text-sm font-semibold text-peer-navy"
                        >{endorsement.author.full_name}</span
                      >
                      <span class="block text-xs text-slate-500"
                        >{endorsement.author.role ?? '역할 미입력'}</span
                      >
                    </div>
                  </a>
                {:else}
                  <div class="flex items-center gap-3">
                    <img
                      class="h-12 w-12 rounded-full border border-slate-200/60 bg-slate-50 object-cover"
                      src={defaultAvatar}
                      alt="알 수 없는 동료의 프로필 이미지"
                    />
                    <div>
                      <span class="block text-sm font-semibold text-slate-500">알 수 없는 동료</span
                      >
                      <span class="block text-xs text-slate-400">역할 미입력</span>
                    </div>
                  </div>
                {/if}
                <time class="text-xs text-slate-400" datetime={endorsement.created_at}>
                  {new Date(endorsement.created_at).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </time>
              </header>
              <p
                class="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700"
              >
                {endorsement.content}
              </p>
              {#if endorsement.author_id === session?.user.id}
                <form
                  method="post"
                  action="?/delete"
                  class="pt-3"
                  onsubmit={() => handleDeleteSubmit(endorsement.id)}
                >
                  <input type="hidden" name="endorsementId" value={endorsement.id} />
                  <button
                    type="submit"
                    class="inline-flex items-center justify-center rounded-full border border-rose-200/60 px-4 py-1.5 text-xs font-semibold text-rose-500 transition hover:-translate-y-0.5 hover:border-rose-400/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40"
                    disabled={deleteSubmittingId === endorsement.id}
                  >
                    {#if deleteSubmittingId === endorsement.id}
                      <svg class="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
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
                      <span class="ml-1">삭제 중…</span>
                    {:else}
                      추천 삭제
                    {/if}
                  </button>
                </form>
              {/if}
            </article>
          {/each}
        {/if}
      </section>

      {#if deleteError}
        <p class="text-sm font-semibold text-rose-500" role="alert">{deleteError}</p>
      {/if}
    </section>
  </main>
{/if}
