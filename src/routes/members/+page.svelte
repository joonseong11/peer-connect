<script lang="ts">
  import { ArrowRight, Search, Sparkles, Users } from 'lucide-svelte';
  import MetaTags from '$lib/components/MetaTags.svelte';
  import type { PageData } from './$types';

  type SortMode = 'recent' | 'endorsements';
  type DirectoryProfile = PageData['profiles'][number];

  const { data } = $props<{ data: PageData }>();

  const defaultAvatar = '/images/default-profile.svg';
  const profiles = (data.profiles ?? []) as DirectoryProfile[];
  const loadError = data.loadError ?? null;
  const invitesEnabled = Boolean(data.invitesEnabled);
  const hasLinkedInvite = Boolean(data.invite?.invite_id);
  const isDirectoryLocked = invitesEnabled && !hasLinkedInvite;

  let searchQuery = $state('');
  let sortMode = $state<SortMode>('recent');

  const formatDate = (value: string | null | undefined) =>
    value
      ? new Date(value).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      : '업데이트 없음';

  const snippet = (value: string | null | undefined, maxLength = 130) => {
    const safe = value?.trim() ?? '';
    return safe.length > maxLength ? `${safe.slice(0, maxLength)}…` : safe;
  };

  const endorsementSnippet = (content: string, maxLength = 80) =>
    content.length > maxLength ? `${content.slice(0, maxLength)}…` : content;

  const filteredProfiles = $derived.by(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const result = profiles.filter((profile: DirectoryProfile) => {
      if (!normalizedQuery) return true;

      return `${profile.full_name} ${profile.role} ${profile.introduction ?? ''}`
        .toLowerCase()
        .includes(normalizedQuery);
    });

    return [...result].sort((left, right) => {
      if (sortMode === 'endorsements') {
        return right.endorsement_count - left.endorsement_count;
      }

      return new Date(right.updated_at ?? 0).getTime() - new Date(left.updated_at ?? 0).getTime();
    });
  });

  const featuredProfiles = $derived.by(() =>
    [...profiles]
      .sort(
        (left: DirectoryProfile, right: DirectoryProfile) =>
          right.endorsement_count - left.endorsement_count
      )
      .slice(0, 2)
  );

  const totalEndorsements = $derived.by(() =>
    profiles.reduce((sum: number, profile: DirectoryProfile) => sum + profile.endorsement_count, 0)
  );
</script>

<MetaTags
  title="멤버 디렉터리 · Peer Connect"
  description="Peer Connect 멤버들의 프로필을 탐색하고 함께 성장할 동료를 찾아보세요."
  path="/members"
  type="website"
/>

<main class="page-shell">
  <section class="surface-panel-strong grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
    <div class="space-y-5">
      <a
        class="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-peer-paper/70 transition hover:bg-white/15 hover:text-peer-paper hover:no-underline"
        href="/"
      >
        <span aria-hidden="true">←</span>
        홈
      </a>
      <div class="space-y-3">
        <p class="section-kicker text-peer-paper/70">멤버 찾기</p>
        <h1 class="headline-balance max-w-3xl text-4xl leading-[1.05] text-peer-paper sm:text-5xl">
          함께 성장할 동료를 더 쉽게 찾을 수 있도록 정리했습니다.
        </h1>
        <p class="max-w-2xl text-base leading-7 text-peer-paper/75 sm:text-lg">
          최근 업데이트, 추천 수, 소개를 기준으로 스캔하기 쉬운 디렉터리 형태로 살펴보세요.
        </p>
      </div>
      {#if !isDirectoryLocked}
        <div class="flex flex-wrap gap-3">
          <div class="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm">
            멤버 {profiles.length}명
          </div>
          <div class="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm">
            추천 {totalEndorsements}개
          </div>
        </div>
      {:else}
        <p
          class="rounded-[20px] border border-white/10 bg-white/10 px-4 py-3 text-sm text-peer-paper/80"
        >
          초대 코드를 연결하면 멤버 디렉터리를 확인할 수 있습니다.
        </p>
      {/if}
      {#if loadError}
        <p
          class="rounded-[20px] border border-white/10 bg-white/10 px-4 py-3 text-sm text-peer-paper/75"
          role="alert"
        >
          {loadError}
        </p>
      {/if}
    </div>

    <div class="rounded-[24px] border border-white/10 bg-white/10 p-5">
      <div class="flex items-center gap-3">
        <div
          class="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-white/10 text-peer-paper"
        >
          <Users class="h-6 w-6" />
        </div>
        <div>
          <p class="meta-line text-peer-paper/55">먼저 보면 좋은 멤버</p>
          <p class="text-xl font-semibold text-peer-paper">
            {#if isDirectoryLocked}
              초대 코드를 연결하면 멤버 디렉터리가 열립니다
            {:else}
              프로필은 관계의 시작점입니다
            {/if}
          </p>
        </div>
      </div>
      <p class="mt-4 text-sm leading-7 text-peer-paper/75">
        {#if isDirectoryLocked}
          초대 기반으로 운영되는 네트워크인 만큼, 코드 연결을 마친 뒤에만 전체 멤버 목록을 둘러볼 수
          있습니다.
        {:else}
          역할만 보는 대신 어떤 협업 맥락에서 추천을 받았는지까지 함께 보면, 더 잘 맞는 동료를 찾기
          쉬워집니다.
        {/if}
      </p>
      {#if isDirectoryLocked}
        <a class="btn mt-5 w-full bg-white text-peer-ink hover:bg-peer-paperAlt" href="/invite">
          초대 코드 입력하기
        </a>
      {:else}
        <a class="btn mt-5 w-full bg-white text-peer-ink hover:bg-peer-paperAlt" href="/profile">
          내 프로필 보완하기
        </a>
      {/if}
    </div>
  </section>

  <section class="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
    <aside class="section-shell space-y-5">
      <div class="space-y-2">
        <p class="section-kicker">먼저 볼 멤버</p>
        <h2 class="headline-balance text-2xl">지금 눈여겨볼 멤버</h2>
        <p class="section-copy">추천이 쌓인 멤버부터 보면 더 잘 맞는 동료를 찾기 쉬워집니다.</p>
      </div>

      {#if isDirectoryLocked}
        <div class="empty-panel">멤버 목록은 초대 코드를 연결한 뒤에 확인할 수 있습니다.</div>
      {:else if featuredProfiles.length === 0}
        <div class="empty-panel">아직 추천이 쌓인 멤버가 없습니다.</div>
      {:else}
        <div class="space-y-3">
          {#each featuredProfiles as profile}
            <a
              class="surface-panel-muted flex flex-col gap-3 hover:no-underline"
              href={`/members/${profile.user_id}`}
            >
              <div class="flex items-center gap-3">
                <img
                  class="h-12 w-12 rounded-[18px] border border-peer-stone bg-white object-cover"
                  src={profile.photo_url ?? defaultAvatar}
                  alt={`${profile.full_name} 프로필 이미지`}
                />
                <div>
                  <p class="font-semibold text-peer-ink">{profile.full_name}</p>
                  <p class="text-sm text-peer-copySoft">{profile.role}</p>
                </div>
              </div>
              <div class="flex flex-wrap gap-2">
                <span class="tag-pill">추천 {profile.endorsement_count}개</span>
                <span class="tag-pill">업데이트 {formatDate(profile.updated_at)}</span>
              </div>
            </a>
          {/each}
        </div>
      {/if}
    </aside>

    <section class="section-shell space-y-5">
      <div class="flex flex-col gap-4 border-b border-peer-stone pb-5">
        <div class="space-y-2">
          <p class="section-kicker">멤버 목록</p>
          <h2 class="headline-balance text-3xl">멤버 디렉터리</h2>
          <p class="section-copy">
            {#if isDirectoryLocked}
              초대 코드 연결을 완료하면 전체 멤버를 탐색하고, 상세 프로필에서 협업의 결을 살펴볼 수
              있습니다.
            {:else}
              최근 활동과 추천 신호를 기준으로 빠르게 비교하고, 상세 프로필에서 협업의 결을 더
              살펴보세요.
            {/if}
          </p>
        </div>

        <div
          class={`grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px] ${isDirectoryLocked ? 'opacity-60' : ''}`}
        >
          <label class="relative block">
            <Search
              class="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-peer-copyMuted"
            />
            <input
              class="field-shell pl-11"
              type="search"
              bind:value={searchQuery}
              placeholder="이름, 역할, 소개로 검색"
              disabled={isDirectoryLocked}
            />
          </label>

          <label class="block">
            <span class="visually-hidden">정렬 기준</span>
            <select class="field-shell" bind:value={sortMode} disabled={isDirectoryLocked}>
              <option value="recent">최근 업데이트순</option>
              <option value="endorsements">추천 많은 순</option>
            </select>
          </label>
        </div>
      </div>

      {#if isDirectoryLocked}
        <div
          class="relative overflow-hidden rounded-[24px] border border-peer-stone bg-peer-paperAlt p-6"
        >
          <div class="space-y-4 blur-[3px] select-none">
            {#each Array(3) as _, index}
              <div
                class="rounded-[20px] border border-peer-stone bg-white p-5 shadow-panel"
                aria-hidden="true"
              >
                <div class="flex items-start gap-4">
                  <div class="h-16 w-16 rounded-[20px] bg-peer-paperAlt"></div>
                  <div class="flex-1 space-y-3">
                    <div class="h-5 w-40 rounded-full bg-peer-paperAlt"></div>
                    <div class="h-4 w-56 rounded-full bg-peer-paperAlt"></div>
                    <div class="flex gap-2">
                      <div class="h-6 w-20 rounded-full bg-peer-paperAlt"></div>
                      <div class="h-6 w-24 rounded-full bg-peer-paperAlt"></div>
                    </div>
                    <div class="h-4 w-full rounded-full bg-peer-paperAlt"></div>
                    <div class="h-4 w-4/5 rounded-full bg-peer-paperAlt"></div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
          <div class="absolute inset-0 flex items-center justify-center bg-white/55 p-6">
            <div class="section-shell max-w-md text-center shadow-panelLg">
              <p class="section-kicker">초대 코드 필요</p>
              <h3 class="headline-balance text-2xl">
                초대 코드를 연결하면 멤버 디렉터리가 열립니다
              </h3>
              <p class="mt-3 text-sm leading-7 text-peer-copySoft">
                Peer Connect는 초대 기반으로 운영됩니다. 코드 연결을 완료하면 전체 멤버 목록을
                둘러볼 수 있습니다.
              </p>
              <div class="mt-5 flex justify-center">
                <a class="btn btn-primary" href="/invite">초대 코드 입력하기</a>
              </div>
            </div>
          </div>
        </div>
      {:else if filteredProfiles.length === 0}
        <div class="empty-panel">
          <p class="font-semibold text-peer-ink">조건에 맞는 멤버가 없습니다.</p>
          <p class="mt-2 text-sm text-peer-copySoft">
            검색어를 조금 넓히거나 정렬 기준을 바꿔보세요.
          </p>
        </div>
      {:else}
        <div class="space-y-4">
          {#each filteredProfiles as profile}
            <a class="directory-row hover:no-underline" href={`/members/${profile.user_id}`}>
              <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div class="flex items-start gap-4">
                  <img
                    class="h-16 w-16 rounded-[20px] border border-peer-stone bg-peer-paperAlt object-cover"
                    src={profile.photo_url ?? defaultAvatar}
                    alt={`${profile.full_name} 프로필 이미지`}
                  />
                  <div class="space-y-3">
                    <div>
                      <h3 class="text-xl font-semibold text-peer-ink">{profile.full_name}</h3>
                      <p class="text-sm text-peer-copySoft">{profile.role}</p>
                    </div>

                    <div class="flex flex-wrap gap-2">
                      <span class="tag-pill">추천 {profile.endorsement_count}개</span>
                      <span class="tag-pill">업데이트 {formatDate(profile.updated_at)}</span>
                    </div>
                  </div>
                </div>

                <span class="inline-flex items-center gap-2 text-sm font-semibold text-peer-forest">
                  프로필 보기
                  <ArrowRight class="h-4 w-4" />
                </span>
              </div>

              <p class="text-sm leading-7 text-peer-copySoft">
                {snippet(profile.introduction, 150) || '아직 소개가 작성되지 않았습니다.'}
              </p>

              {#if profile.endorsement_count > 0 && profile.first_endorsement}
                <div class="rounded-[18px] border border-peer-stone bg-peer-paperAlt px-4 py-4">
                  <div class="mb-2 flex items-center gap-2 text-peer-amber">
                    <Sparkles class="h-4 w-4" />
                    <p class="meta-line text-peer-amber">추천 미리보기</p>
                  </div>
                  <p class="text-sm leading-7 text-peer-copy">
                    “{endorsementSnippet(profile.first_endorsement)}”
                  </p>
                </div>
              {/if}
            </a>
          {/each}
        </div>
      {/if}
    </section>
  </section>
</main>
