<script lang="ts">
  import {
    ArrowRight,
    CalendarClock,
    MessagesSquare,
    Plus,
    Search,
    Sparkles,
    Users
  } from 'lucide-svelte';
  import MetaTags from '$lib/components/MetaTags.svelte';
  import type { PageData } from './$types';

  type LoungeAuthor = {
    full_name: string | null;
    role: string | null;
    photo_url: string | null;
  };

  type LoungePost = Omit<PageData['posts'][number], 'author'> & {
    author?: LoungeAuthor | LoungeAuthor[] | null;
  };

  type NormalizedLoungePost = Omit<LoungePost, 'author'> & {
    author?: LoungeAuthor | null;
  };
  type LoungeFormat = '커피챗' | '스터디' | '세미나' | '사이드프로젝트' | '모각코' | '네트워킹';
  type LoungeStatus = '모집 중' | '대화 시작' | '회고 공유';

  type EnrichedPost = NormalizedLoungePost & {
    excerpt: string;
    format: LoungeFormat;
    status: LoungeStatus;
    freshness: 'today' | 'week' | 'archive';
  };

  const { data } = $props<{ data: PageData }>();

  const { posts, loadError } = data;

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

  const clip = (value: string, limit = 170) =>
    value.length > limit ? `${value.slice(0, limit)}…` : value;

  const detectFormat = (post: LoungePost): LoungeFormat => {
    const source = `${post.title} ${post.content}`.toLowerCase();

    if (source.includes('커피챗') || source.includes('coffee')) return '커피챗';
    if (
      source.includes('스터디') ||
      source.includes('study') ||
      source.includes('워크숍') ||
      source.includes('workshop')
    ) {
      return '스터디';
    }
    if (
      source.includes('세미나') ||
      source.includes('토크') ||
      source.includes('발표') ||
      source.includes('meetup')
    ) {
      return '세미나';
    }
    if (
      source.includes('사이드') ||
      source.includes('프로젝트') ||
      source.includes('project') ||
      source.includes('해커톤')
    ) {
      return '사이드프로젝트';
    }
    if (
      source.includes('모각코') ||
      source.includes('함께 코딩') ||
      source.includes('pair') ||
      source.includes('코딩')
    ) {
      return '모각코';
    }
    return '네트워킹';
  };

  const detectStatus = (post: LoungePost): LoungeStatus => {
    const source = `${post.title} ${post.content}`.toLowerCase();

    if (source.includes('회고') || source.includes('후기') || source.includes('정리')) {
      return '회고 공유';
    }

    if (
      source.includes('모집') ||
      source.includes('구해') ||
      source.includes('함께') ||
      source.includes('참여') ||
      source.includes('오실 분')
    ) {
      return '모집 중';
    }

    return '대화 시작';
  };

  const detectFreshness = (value: string): EnrichedPost['freshness'] => {
    const diff = Date.now() - new Date(value).getTime();
    const day = 1000 * 60 * 60 * 24;

    if (diff <= day) return 'today';
    if (diff <= day * 7) return 'week';
    return 'archive';
  };

  const normalizedPosts: NormalizedLoungePost[] = posts.map((post: LoungePost) => ({
    ...post,
    author: Array.isArray(post.author) ? post.author[0] : post.author
  }));

  const enrichedPosts = normalizedPosts.map(
    (post: NormalizedLoungePost): EnrichedPost => ({
      ...post,
      excerpt: clip(post.content),
      format: detectFormat(post),
      status: detectStatus(post),
      freshness: detectFreshness(post.created_at)
    })
  );

  const featuredPost = enrichedPosts[0] ?? null;
  const totalHosts = new Set(
    enrichedPosts.map((post: EnrichedPost) => post.author?.full_name ?? post.author_id ?? post.id)
  ).size;
  const recentPostsCount = enrichedPosts.filter(
    (post: EnrichedPost) => post.freshness !== 'archive'
  ).length;

  const allFormats = [
    '전체',
    ...new Set(enrichedPosts.map((post: EnrichedPost) => post.format))
  ] as const;

  type FormatFilter = (typeof allFormats)[number];

  let searchQuery = $state('');
  let selectedFormat = $state<FormatFilter>('전체');

  const filteredPosts = $derived(
    enrichedPosts.filter((post: EnrichedPost) => {
      const matchesSearch = `${post.title} ${post.content} ${post.author?.full_name ?? ''}`
        .toLowerCase()
        .includes(searchQuery.trim().toLowerCase());
      const matchesFormat = selectedFormat === '전체' || post.format === selectedFormat;

      return matchesSearch && matchesFormat;
    })
  );

  const statusClasses: Record<LoungeStatus, string> = {
    '모집 중': 'border-emerald-200 bg-emerald-50 text-emerald-700',
    '대화 시작': 'border-slate-200 bg-slate-100 text-slate-700',
    '회고 공유': 'border-amber-200 bg-amber-50 text-amber-700'
  };

  const formatClasses: Record<LoungeFormat, string> = {
    커피챗: 'bg-rose-50 text-rose-700',
    스터디: 'bg-blue-50 text-blue-700',
    세미나: 'bg-violet-50 text-violet-700',
    사이드프로젝트: 'bg-amber-50 text-amber-700',
    모각코: 'bg-emerald-50 text-emerald-700',
    네트워킹: 'bg-slate-100 text-slate-700'
  };
</script>

<MetaTags
  title="모임 라운지 · Peer Connect"
  description="Peer Connect 멤버들과 함께하는 다양한 모임을 만들고 참여해보세요."
  path="/gatherings"
  type="website"
/>

<main class="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 pb-20 pt-14 sm:px-8">
  <section
    class="overflow-hidden rounded-[2rem] border border-slate-200/70 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_32%),linear-gradient(180deg,#fffdf8_0%,#f8fafc_100%)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-8"
  >
    <div class="grid gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)] xl:items-start">
      <div class="space-y-5">
        <a
          class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 transition hover:border-slate-300 hover:text-slate-700 hover:no-underline"
          href="/"
        >
          <span aria-hidden="true">←</span>
          홈
        </a>
        <div class="space-y-3">
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
            모임 라운지
          </p>
          <h1
            class="headline-balance max-w-3xl text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl"
          >
            가볍게 대화를 시작해도 좋고, 깊게 함께해도 좋습니다.
          </h1>
          <p class="max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            커피챗, 모각코, 세미나, 사이드프로젝트까지. 지금 Peer Connect 안에서 열리고 있는 모임을
            한 번에 보고, 직접 새로운 흐름을 시작할 수 있습니다.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-3 pt-1">
          <a href="/gatherings/new" class="btn btn-primary inline-flex items-center gap-2">
            <Plus class="h-4 w-4" />
            <span>모임 열기</span>
          </a>
          <a href="#lounge-feed" class="btn btn-secondary inline-flex items-center gap-2">
            <span>모임 둘러보기</span>
            <ArrowRight class="h-4 w-4" />
          </a>
        </div>
        {#if loadError}
          <p
            class="w-fit rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600"
            role="alert"
          >
            {loadError}
          </p>
        {/if}
      </div>

      <aside class="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
        <article class="rounded-[1.6rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="rounded-2xl bg-emerald-50 p-2 text-emerald-700">
              <MessagesSquare class="h-5 w-5" />
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                열린 모임
              </p>
              <p class="mt-1 text-2xl font-semibold text-slate-900">{enrichedPosts.length}</p>
            </div>
          </div>
        </article>
        <article class="rounded-[1.6rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="rounded-2xl bg-blue-50 p-2 text-blue-700">
              <CalendarClock class="h-5 w-5" />
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                최근 7일
              </p>
              <p class="mt-1 text-2xl font-semibold text-slate-900">{recentPostsCount}</p>
            </div>
          </div>
        </article>
        <article class="rounded-[1.6rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="rounded-2xl bg-amber-50 p-2 text-amber-700">
              <Users class="h-5 w-5" />
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                호스트 수
              </p>
              <p class="mt-1 text-2xl font-semibold text-slate-900">{totalHosts}</p>
            </div>
          </div>
        </article>
      </aside>
    </div>
  </section>

  {#if featuredPost}
    <section class="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
      <article
        class="rounded-[1.9rem] border border-slate-200/70 bg-slate-900 p-6 text-slate-50 shadow-[0_24px_48px_rgba(15,23,42,0.16)] sm:p-7"
      >
        <div class="flex flex-wrap items-center gap-2">
          <span
            class={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses[featuredPost.status]}`}
          >
            {featuredPost.status}
          </span>
          <span
            class={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${formatClasses[featuredPost.format]}`}
          >
            {featuredPost.format}
          </span>
          <span class="inline-flex items-center gap-1 text-xs font-medium text-slate-300">
            <Sparkles class="h-3.5 w-3.5" />
            지금 주목할 모임
          </span>
        </div>
        <div class="mt-5 space-y-3">
          <h2 class="text-2xl font-semibold leading-tight sm:text-[2rem]">
            {featuredPost.title}
          </h2>
          <p class="max-w-3xl text-sm leading-7 text-slate-200 sm:text-base">
            {clip(featuredPost.content, 240)}
          </p>
        </div>
        <div class="mt-6 flex flex-wrap items-center gap-3">
          <img
            class="h-11 w-11 rounded-2xl border border-slate-700/80 bg-slate-800 object-cover"
            src={featuredPost.author?.photo_url ?? '/images/default-profile.svg'}
            alt={(featuredPost.author?.full_name ?? '알 수 없는 멤버') + '의 프로필 이미지'}
          />
          <div>
            <p class="text-sm font-semibold text-white">
              {featuredPost.author?.full_name ?? '알 수 없는 멤버'}
            </p>
            <p class="text-xs text-slate-300">
              {featuredPost.author?.role ?? '역할 미입력'} · {formatDateTime(
                featuredPost.created_at
              )}
            </p>
          </div>
        </div>
        <div class="mt-6 flex flex-wrap items-center gap-3">
          <a href={`/gatherings/${featuredPost.id}`} class="btn btn-primary">자세히 보기</a>
          <a
            href="/gatherings/new"
            class="btn btn-secondary border-white/20 text-white hover:bg-white/10"
            >이 흐름 이어가기</a
          >
        </div>
      </article>

      <aside class="rounded-[1.9rem] border border-slate-200/70 bg-white/95 p-6 shadow-sm sm:p-7">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">라운지 팁</p>
        <h3 class="headline-balance mt-3 text-2xl font-semibold text-slate-900">
          어떤 모임이 잘 보이나요?
        </h3>
        <ul class="mt-5 space-y-4 text-sm leading-7 text-slate-600">
          <li class="rounded-2xl bg-slate-50 px-4 py-3">
            제목에서 형식과 목적이 바로 드러나는 모임이 더 빨리 읽힙니다.
          </li>
          <li class="rounded-2xl bg-slate-50 px-4 py-3">
            진행 방식, 대상, 준비물을 본문 앞부분에 먼저 쓰면 참여 판단이 쉬워집니다.
          </li>
          <li class="rounded-2xl bg-slate-50 px-4 py-3">
            회고형 글도 환영합니다. 모임 이후 인사이트를 남기면 라운지 밀도가 올라갑니다.
          </li>
        </ul>
      </aside>
    </section>
  {/if}

  <section
    id="lounge-feed"
    class="rounded-[1.9rem] border border-slate-200/70 bg-white/95 p-5 shadow-sm sm:p-6"
  >
    <div class="flex flex-col gap-5">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div class="space-y-2">
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">모임 목록</p>
          <h2 class="headline-balance text-2xl font-semibold text-slate-900 sm:text-3xl">
            지금 열려 있는 흐름
          </h2>
          <p class="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            검색과 형식을 기준으로 라운지를 빠르게 둘러보세요. 마음에 드는 흐름이 없다면 직접 새로운
            모임을 열 수도 있습니다.
          </p>
        </div>
        <a
          href="/gatherings/new"
          class="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:no-underline"
        >
          <Plus class="h-4 w-4" />
          <span>모임 열기</span>
        </a>
      </div>

      <div>
        <label
          class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
        >
          <Search class="h-4 w-4 text-slate-400" />
          <span class="visually-hidden">모임 검색</span>
          <input
            bind:value={searchQuery}
            type="search"
            placeholder="제목, 내용, 작성자 이름으로 검색"
            class="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
        </label>
      </div>

      <div class="flex flex-wrap gap-2">
        {#each allFormats as format}
          <button
            type="button"
            class={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
              selectedFormat === format
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
            onclick={() => (selectedFormat = format)}
          >
            {format}
          </button>
        {/each}
      </div>

      {#if filteredPosts.length === 0}
        <div
          class="rounded-[1.6rem] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-10 text-center"
        >
          <p class="text-lg font-semibold text-slate-800">아직 조건에 맞는 모임이 없습니다</p>
          <p class="mt-2 text-sm leading-7 text-slate-500">
            필터를 조금 넓히거나, 직접 새로운 흐름을 시작해보세요.
          </p>
          <div class="mt-5 flex justify-center">
            <a href="/gatherings/new" class="btn btn-primary">첫 모임 열기</a>
          </div>
        </div>
      {:else}
        <ul class="grid gap-4">
          {#each filteredPosts as post}
            <li>
              <a
                class="group grid gap-5 rounded-[1.7rem] border border-slate-200/80 bg-white px-5 py-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_36px_rgba(15,23,42,0.10)] hover:no-underline sm:px-6 sm:py-6 lg:grid-cols-[minmax(0,1fr)_auto]"
                href={`/gatherings/${post.id}`}
              >
                <div class="space-y-4">
                  <div class="flex flex-wrap items-center gap-2">
                    <span
                      class={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses[post.status]}`}
                    >
                      {post.status}
                    </span>
                    <span
                      class={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${formatClasses[post.format]}`}
                    >
                      {post.format}
                    </span>
                    <span class="text-xs font-medium text-slate-400">
                      {formatDate(post.created_at)}
                    </span>
                  </div>

                  <div class="space-y-2">
                    <h3
                      class="text-xl font-semibold leading-snug text-slate-900 transition group-hover:text-slate-700"
                    >
                      {post.title}
                    </h3>
                    <p class="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                      {post.excerpt}
                    </p>
                  </div>

                  <div class="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                    <div class="flex items-center gap-3">
                      <img
                        class="h-10 w-10 rounded-2xl border border-slate-200/70 bg-slate-50 object-cover"
                        src={post.author?.photo_url ?? '/images/default-profile.svg'}
                        alt={(post.author?.full_name ?? '알 수 없는 멤버') + '의 프로필 이미지'}
                      />
                      <div>
                        <p class="font-semibold text-slate-800">
                          {post.author?.full_name ?? '알 수 없는 멤버'}
                        </p>
                        <p class="text-xs text-slate-500">{post.author?.role ?? '역할 미입력'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="flex items-end justify-between gap-4 lg:flex-col lg:items-end">
                  <div
                    class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right text-xs font-medium text-slate-500"
                  >
                    <p class="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      Posted
                    </p>
                    <p class="mt-1 text-sm font-semibold text-slate-800">
                      {formatDateTime(post.created_at)}
                    </p>
                  </div>
                  <span
                    class="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition group-hover:text-slate-900"
                  >
                    <span>자세히 보기</span>
                    <ArrowRight class="h-4 w-4" />
                  </span>
                </div>
              </a>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </section>
</main>
