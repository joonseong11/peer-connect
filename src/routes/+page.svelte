<script lang="ts">
  import { browser } from '$app/environment';
  import { onDestroy } from 'svelte';
  import { createBrowserClient } from '@supabase/ssr';
  import type { Session, SupabaseClient } from '@supabase/supabase-js';
  import { ArrowRight, CalendarDays, Plus, Sparkles, UserRound, Users } from 'lucide-svelte';
  import MetaTags from '$lib/components/MetaTags.svelte';
  import { getSupabaseConfig } from '$lib/supabase/config';

  const trustSignals = [
    { value: 'Invite only', label: '초대 기반 운영' },
    { value: 'Profiles', label: '프로필 중심 신뢰' },
    { value: 'Endorsements', label: '추천으로 쌓는 맥락' },
    { value: '모임으로 연결', label: '교류가 이어지는 모임' }
  ];

  const featuredMembers = [
    {
      name: '김소연',
      role: '플랫폼 엔지니어',
      tags: ['백엔드', '인프라', '멘토링'],
      highlight: '대규모 전환 경험을 팀의 언어로 풀어내는 동료'
    },
    {
      name: '박진우',
      role: '프론트엔드 엔지니어',
      tags: ['디자인 시스템', 'Svelte', '접근성'],
      highlight: '구조와 경험을 함께 보는 구현 중심 메이커'
    },
    {
      name: '최다은',
      role: '머신러닝 엔지니어',
      tags: ['LLM', 'MLOps', '실험'],
      highlight: '실험을 빠르게 설계하고 제품으로 연결하는 사람'
    }
  ];

  const featuredGatherings = [
    {
      format: '스터디',
      title: 'LLM 프롬프트 엔지니어링 스터디',
      host: '박진우 · 프론트엔드 엔지니어',
      summary: '실서비스에서 쓰는 프롬프트 패턴과 평가 방식을 함께 정리합니다.'
    },
    {
      format: '커피챗',
      title: '주니어에서 시니어로 넘어가는 설계 감각 이야기',
      host: '김소연 · 플랫폼 엔지니어',
      summary: '실패했던 설계와 다시 선택할 기준을 가볍게 나눕니다.'
    }
  ];

  const inviteFlow = [
    {
      label: '01',
      title: '초대로 시작',
      copy: '누구나가 아니라 신뢰하는 동료로 네트워크의 기본선을 맞춥니다.'
    },
    {
      label: '02',
      title: '프로필과 추천',
      copy: '단순 소개가 아니라 협업 맥락과 추천으로 신뢰를 쌓습니다.'
    },
    {
      label: '03',
      title: '모임으로 확장',
      copy: '가벼운 커피챗부터 깊은 스터디까지 관계를 실제 대화로 이어갑니다.'
    }
  ];

  const { data } = $props<{ data: App.PageData }>();

  let localSession = $state(data.session);
  const session = $derived(localSession);
  const homeData = $derived(data.homeData ?? null);
  const recentMembers = $derived(homeData?.recentMembers ?? []);
  const recentGatherings = $derived(homeData?.recentGatherings ?? []);
  const nextAction = $derived(homeData?.nextAction ?? null);
  const profileSummary = $derived(homeData?.summary ?? null);
  const profileCard = $derived(homeData?.profile ?? null);
  const publicProfileHref = $derived(
    session?.user?.id ? `/members/${session.user.id}` : '/profile'
  );
  let authError = $state<string | null>(data.authErrorMessage ?? null);
  let supabase: SupabaseClient | null = null;
  const invitesEnabled = $derived(data.invitesEnabled ?? false);
  const authRedirectTarget = $derived(data.authRedirectTarget ?? null);
  const inviteePrompt = $derived(data.inviteePrompt ?? null);
  const showNextAction = $derived(Boolean(nextAction) && !inviteePrompt);
  let acknowledgeSubmittingIntent = $state<string | null>(null);
  let lastPromptId = $state<string | null>(null);

  const defaultAvatar = '/images/default-profile.svg';
  const metaDescription =
    '초대 기반 프라이빗 개발자 네트워크, Peer Connect에서 깊이 있는 동료와 함께 성장하세요.';

  $effect(() => {
    const currentPromptId = inviteePrompt?.redemptionId ?? null;
    if (currentPromptId !== lastPromptId) {
      acknowledgeSubmittingIntent = null;
      lastPromptId = currentPromptId;
    }
  });

  if (browser) {
    const initSupabaseClient = () => {
      const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
      let client = supabase;
      if (!client) {
        client = createBrowserClient(supabaseUrl, supabaseAnonKey, { isSingleton: true });
        supabase = client;
      }

      if (!client) {
        console.error('Supabase 클라이언트를 초기화하지 못했습니다.');
        return;
      }

      const ensuredClient = client as SupabaseClient;

      const {
        data: { subscription }
      } = ensuredClient.auth.onAuthStateChange((_event, newSession: Session | null) => {
        localSession = newSession;
      });

      onDestroy(() => {
        subscription.unsubscribe();
      });
    };

    initSupabaseClient();
  }

  $effect(() => {
    localSession = data.session;
  });

  const handleGoogleSignIn = async () => {
    authError = null;

    const client = supabase;

    if (!client) {
      authError = '인증 클라이언트를 초기화하지 못했습니다. 새로고침 후 다시 시도해주세요.';
      return;
    }

    const ensuredClient = client as SupabaseClient;
    const nextParam = authRedirectTarget ? `?next=${encodeURIComponent(authRedirectTarget)}` : '';

    const { error } = await ensuredClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback${nextParam}`
      }
    });

    if (error) {
      console.error('Google sign-in error', error);
      authError = '로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
    }
  };

  const handleAcknowledgeSubmit = (event: SubmitEvent) => {
    const submitter = event.submitter as HTMLButtonElement | null;
    acknowledgeSubmittingIntent = submitter?.value ?? null;
  };

  const formatDate = (value: string | null | undefined) =>
    value
      ? new Date(value).toLocaleDateString('ko-KR', {
          month: 'short',
          day: 'numeric'
        })
      : '최근 업데이트 없음';
</script>

<MetaTags
  title="Peer Connect · 함께 성장하는 개발자 커뮤니티"
  description={metaDescription}
  path="/"
  type="website"
/>

<main class="page-shell">
  {#if session}
    <section class="surface-panel-strong grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
      <div class="space-y-5">
        <p class="section-kicker text-peer-paper/70">오늘의 Peer Connect</p>
        <div class="space-y-3">
          <h1
            class="headline-balance max-w-3xl text-4xl leading-[1.05] text-peer-paper sm:text-5xl"
          >
            오늘의 네트워크를 확인해보세요
          </h1>
          <p class="max-w-2xl text-base leading-7 text-peer-paper/75 sm:text-lg">
            새로운 추천, 새로 열린 모임, 아직 끝내지 않은 프로필 작업까지 지금 필요한 흐름만
            모았습니다.
          </p>
        </div>

        <div class="flex flex-wrap gap-3">
          <div class="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm">
            받은 추천 {profileSummary?.endorsementCount ?? 0}개
          </div>
          <div class="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm">
            최근 열린 모임 {profileSummary?.recentGatheringCount ?? 0}개
          </div>
          <div class="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm">
            프로필 완성도 {profileSummary?.profileCompletion ?? 0}%
          </div>
        </div>

        {#if homeData?.homeError}
          <p
            class="rounded-[20px] border border-white/10 bg-white/10 px-4 py-3 text-sm text-peer-paper/75"
          >
            {homeData.homeError}
          </p>
        {/if}
      </div>

      <div class="space-y-4 rounded-[24px] border border-white/10 bg-white/10 p-5">
        <p class="meta-line text-peer-paper/60">내 상태 요약</p>
        <div class="flex items-center gap-4">
          <img
            class="h-16 w-16 rounded-[20px] border border-white/10 bg-white/10 object-cover"
            src={profileCard?.photo_url ?? defaultAvatar}
            alt="내 프로필 이미지"
          />
          <div class="space-y-1">
            <h2 class="text-2xl text-peer-paper">{profileCard?.full_name ?? '멤버'}</h2>
            <p class="text-sm text-peer-paper/70">{profileCard?.role}</p>
          </div>
        </div>
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <a
            class="rounded-[20px] border border-white/10 bg-white/10 p-4 text-peer-paper no-underline transition hover:bg-white/15"
            href={publicProfileHref}
          >
            <p class="meta-line text-peer-paper/60">공개 프로필</p>
            <p class="mt-2 text-lg font-semibold">추천서와 이력을 한 페이지로 보여줄 수 있습니다</p>
            <p class="mt-2 text-sm leading-6 text-peer-paper/70">
              면접관이나 외부 동료에게 공유할 공개 프로필을 바로 확인해보세요.
            </p>
            <span class="mt-4 inline-flex items-center gap-2 text-sm font-semibold">
              공개 프로필 보기
              <ArrowRight class="h-4 w-4" />
            </span>
          </a>
          <div class="rounded-[20px] border border-white/10 bg-white/10 p-4">
            <p class="meta-line text-peer-paper/60">최근 업데이트</p>
            <p class="mt-2 text-lg font-semibold text-peer-paper">
              {formatDate(profileCard?.updated_at)}
            </p>
            <p class="mt-2 text-sm text-peer-paper/70">
              프로필과 활동 내역을 최신 상태로 유지해보세요.
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
      <div class="space-y-6">
        <section class="section-shell space-y-5">
          <div class="flex flex-wrap items-end justify-between gap-4">
            <div class="space-y-1">
              <p class="section-kicker">지금 살펴볼 멤버</p>
              <h2 class="text-3xl">지금 눈여겨볼 멤버</h2>
              <p class="section-copy">
                최근에 프로필을 다듬은 멤버부터 보며 연결의 실마리를 찾아보세요.
              </p>
            </div>
            <a class="btn btn-secondary" href="/members">멤버 더 보기</a>
          </div>

          {#if recentMembers.length === 0}
            <div class="empty-panel">아직 둘러볼 멤버 정보가 충분하지 않습니다.</div>
          {:else}
            <div class="space-y-3">
              {#each recentMembers as member}
                <a
                  class="surface-panel flex flex-col gap-4 no-underline transition hover:border-peer-stoneDark hover:bg-peer-paperAlt md:flex-row md:items-center"
                  href={`/members/${member.user_id}`}
                >
                  <img
                    class="h-16 w-16 rounded-[20px] border border-peer-stone bg-peer-paperAlt object-cover"
                    src={member.photo_url ?? defaultAvatar}
                    alt={`${member.full_name} 프로필 이미지`}
                  />
                  <div class="min-w-0 flex-1 space-y-2">
                    <div class="flex flex-wrap items-center gap-2">
                      <h3 class="text-xl">{member.full_name}</h3>
                      <span class="tag-pill">{member.role}</span>
                      {#if member.endorsementCount > 0}
                        <span class="tag-pill">추천 {member.endorsementCount}개</span>
                      {/if}
                    </div>
                    <p class="text-sm leading-6 text-peer-copySoft">
                      {member.introduction ||
                        '소개를 업데이트하며 자신을 더 선명하게 드러내는 중입니다.'}
                    </p>
                  </div>
                  <span
                    class="inline-flex items-center gap-2 text-sm font-semibold text-peer-forest"
                  >
                    프로필 보기
                    <ArrowRight class="h-4 w-4" />
                  </span>
                </a>
              {/each}
            </div>
          {/if}
        </section>

        <section class="section-shell space-y-5">
          <div class="flex flex-wrap items-end justify-between gap-4">
            <div class="space-y-1">
              <p class="section-kicker">활발한 모임</p>
              <h2 class="text-3xl">활발한 모임</h2>
              <p class="section-copy">
                최근에 열린 대화부터 살펴보며 지금 네트워크 안에서 어떤 흐름이 이어지는지
                확인해보세요.
              </p>
            </div>
            <div class="flex gap-2">
              <a class="btn btn-secondary" href="/gatherings">모임 더 보기</a>
              <a class="btn btn-primary" href="/gatherings/new">
                <Plus class="h-4 w-4" />
                <span>모임 열기</span>
              </a>
            </div>
          </div>

          {#if recentGatherings.length === 0}
            <div class="empty-panel">아직 열린 모임이 없습니다. 첫 모임을 직접 시작해보세요.</div>
          {:else}
            <div class="space-y-3">
              {#each recentGatherings as gathering}
                <a
                  class="surface-panel flex flex-col gap-3 no-underline transition hover:border-peer-stoneDark hover:bg-peer-paperAlt"
                  href={`/gatherings/${gathering.id}`}
                >
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="tag-pill">모임</span>
                    <span class="tag-pill">{formatDate(gathering.created_at)}</span>
                  </div>
                  <div class="space-y-2">
                    <h3 class="text-xl">{gathering.title}</h3>
                    <p class="text-sm leading-6 text-peer-copySoft">{gathering.summary}</p>
                  </div>
                  <div
                    class="flex flex-wrap items-center justify-between gap-3 text-sm text-peer-copySoft"
                  >
                    <span>
                      {gathering.author?.full_name ?? '알 수 없는 멤버'}
                      {#if gathering.author?.role}
                        · {gathering.author.role}
                      {/if}
                    </span>
                    <span class="inline-flex items-center gap-2 font-semibold text-peer-forest">
                      자세히 보기
                      <ArrowRight class="h-4 w-4" />
                    </span>
                  </div>
                </a>
              {/each}
            </div>
          {/if}
        </section>
      </div>

      <div class="space-y-6">
        {#if showNextAction}
          <aside class="section-shell space-y-4">
            <div class="flex items-center gap-2 text-peer-amber">
              <Sparkles class="h-4 w-4" />
              <p class="meta-line text-peer-amber">다음 행동</p>
            </div>
            <h2 class="text-2xl">{nextAction?.title}</h2>
            <p class="section-copy">{nextAction?.description}</p>
            <a class="btn btn-primary w-full" href={nextAction?.href ?? '/profile'}>
              <span>{nextAction?.ctaLabel}</span>
              <ArrowRight class="h-4 w-4" />
            </a>
          </aside>
        {/if}

        <aside class="section-shell space-y-4">
          <div class="flex items-center gap-2 text-peer-forest">
            <Users class="h-4 w-4" />
            <p class="meta-line text-peer-copyMuted">초대 현황</p>
          </div>
          <h2 class="text-2xl">
            {#if invitesEnabled}
              신뢰하는 동료를 더 초대할 수 있습니다
            {:else}
              초대 기능을 점검 중입니다
            {/if}
          </h2>
          <p class="section-copy">
            {#if invitesEnabled}
              초대 링크를 공유하고, 합류한 동료와 추천을 주고받으며 네트워크를 넓혀보세요.
            {:else}
              초대 기능이 다시 열리면 여기에서 바로 상태를 확인할 수 있습니다.
            {/if}
          </p>
          <a class="btn btn-secondary w-full" href={invitesEnabled ? '/invite' : '/members'}>
            {#if invitesEnabled}
              초대 관리로 이동
            {:else}
              멤버 둘러보기
            {/if}
          </a>
        </aside>

        <aside class="section-shell space-y-4">
          <div class="flex items-center gap-2 text-peer-copy">
            <UserRound class="h-4 w-4" />
            <p class="meta-line text-peer-copyMuted">내 활동 요약</p>
          </div>
          <div class="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div class="surface-panel-muted space-y-2">
              <p class="meta-line">프로필 완성도</p>
              <p class="text-2xl font-semibold text-peer-ink">
                {profileSummary?.profileCompletion ?? 0}%
              </p>
            </div>
            <div class="surface-panel-muted space-y-2">
              <p class="meta-line">받은 추천</p>
              <p class="text-2xl font-semibold text-peer-ink">
                {profileSummary?.endorsementCount ?? 0}개
              </p>
            </div>
            <div class="surface-panel-muted space-y-2">
              <p class="meta-line">최근 모임</p>
              <p class="text-2xl font-semibold text-peer-ink">
                {profileSummary?.recentGatheringCount ?? 0}개
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  {:else}
    <section class="surface-panel-strong grid gap-8 xl:grid-cols-[1.25fr_0.9fr]">
      <div class="space-y-6">
        <p class="section-kicker text-peer-paper/70">초대 기반 개발자 네트워크</p>
        <div class="space-y-4">
          <h1
            class="headline-balance max-w-3xl text-4xl leading-[1.02] text-peer-paper sm:text-6xl"
          >
            믿을 만한 동료와 더 깊게 연결되는 개발자 네트워크
          </h1>
          <p class="max-w-2xl text-base leading-7 text-peer-paper/75 sm:text-lg">
            Peer Connect는 초대 기반으로 운영되는 프라이빗 네트워크입니다. 프로필, 추천, 모임을 통해
            서로의 실력과 맥락을 더 정확하게 이해할 수 있습니다.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <button class="btn btn-primary" onclick={handleGoogleSignIn}>
            <span>Google로 시작하기</span>
            <ArrowRight class="h-4 w-4" />
          </button>
          <a
            class="btn btn-secondary border-white/15 bg-white/10 text-peer-paper hover:bg-white/15"
            href="#invitation-model"
          >
            어떻게 운영되나요
          </a>
        </div>
        {#if authError}
          <p
            class="rounded-[20px] border border-white/10 bg-white/10 px-4 py-3 text-sm text-rose-200"
            role="alert"
          >
            {authError}
          </p>
        {/if}
      </div>

      <div class="grid gap-4">
        <div class="rounded-[24px] border border-white/10 bg-white/10 p-5">
          <p class="meta-line text-peer-paper/60">최근 네트워크 신호</p>
          <div class="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {#each trustSignals as signal}
              <div class="rounded-[20px] border border-white/10 bg-white/10 p-4">
                <p class="text-sm font-medium text-peer-paper/65">{signal.label}</p>
                <p class="mt-2 text-lg font-semibold text-peer-paper">{signal.value}</p>
              </div>
            {/each}
          </div>
        </div>
        <article class="preview-card max-w-none">
          <p class="meta-line text-peer-paper/60">추천 미리보기</p>
          <p class="text-lg font-semibold">“복잡한 전환기를 팀의 언어로 정리해주는 동료였어요.”</p>
          <p class="text-sm leading-6 text-peer-paper/75">
            실무 경험이 드러나는 추천이 쌓일수록, 새로운 연결도 더 정확해집니다.
          </p>
          <div
            class="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-peer-paper/55"
          >
            <span>프로덕트 엔지니어</span>
            <span>Peer Connect</span>
          </div>
        </article>
      </div>
    </section>

    <section id="why-peer-connect" class="section-shell space-y-5">
      <div class="space-y-2">
        <p class="section-kicker">왜 Peer Connect인가</p>
        <h2 class="headline-balance text-3xl">더 깊은 연결이 만들어지는 방식</h2>
        <p class="section-copy">
          누구나 들어오고 누구도 기억되지 않는 커뮤니티 대신, 신뢰가 쌓이는 방식으로 연결을
          설계했습니다.
        </p>
      </div>
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {#each trustSignals as signal}
          <article class="surface-panel-muted space-y-2">
            <p class="meta-line">{signal.label}</p>
            <p class="text-xl font-semibold text-peer-ink">{signal.value}</p>
          </article>
        {/each}
      </div>
    </section>

    <section id="members-preview" class="section-shell space-y-5">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="space-y-2">
          <p class="section-kicker">멤버 미리보기</p>
          <h2 class="headline-balance text-3xl">신뢰를 먼저 읽을 수 있는 멤버 프로필</h2>
          <p class="section-copy">
            역할만 적혀 있는 프로필이 아니라, 어떤 문제를 다뤄왔는지와 어떻게 일하는지까지 읽을 수
            있어야 합니다.
          </p>
        </div>
      </div>
      <div class="grid gap-4 lg:grid-cols-3">
        {#each featuredMembers as member}
          <article class="surface-panel flex h-full flex-col gap-4">
            <div class="flex items-center gap-3">
              <div
                class="inline-flex h-14 w-14 items-center justify-center rounded-[20px] bg-peer-paperAlt text-peer-forest"
              >
                <UserRound class="h-6 w-6" />
              </div>
              <div>
                <h3 class="text-xl">{member.name}</h3>
                <p class="text-sm text-peer-copySoft">{member.role}</p>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              {#each member.tags as tag}
                <span class="tag-pill">{tag}</span>
              {/each}
            </div>
            <p class="text-sm leading-6 text-peer-copySoft">{member.highlight}</p>
          </article>
        {/each}
      </div>
    </section>

    <section id="gatherings-preview" class="section-shell space-y-5">
      <div class="space-y-2">
        <p class="section-kicker">모임 라운지</p>
        <h2 class="headline-balance text-3xl">교류를 실제 대화로 이어주는 모임 라운지</h2>
        <p class="section-copy">
          가벼운 커피챗부터 깊은 스터디까지, 지금 시작할 수 있는 대화의 단서를 모아둡니다.
        </p>
      </div>
      <div class="grid gap-4 lg:grid-cols-2">
        {#each featuredGatherings as gathering}
          <article class="surface-panel space-y-4">
            <div class="flex items-center gap-2">
              <span class="tag-pill">{gathering.format}</span>
              <span class="tag-pill">모임 라운지</span>
            </div>
            <div class="space-y-2">
              <h3 class="text-2xl">{gathering.title}</h3>
              <p class="text-sm text-peer-copySoft">{gathering.host}</p>
            </div>
            <p class="text-sm leading-6 text-peer-copySoft">{gathering.summary}</p>
          </article>
        {/each}
      </div>
    </section>

    <section id="invitation-model" class="section-shell space-y-5">
      <div class="space-y-2">
        <p class="section-kicker">운영 방식</p>
        <h2 class="headline-balance text-3xl">누구에게나 열려 있는 커뮤니티는 아닙니다</h2>
        <p class="section-copy">
          초대, 프로필, 추천이라는 세 단계가 신뢰의 기본선을 만듭니다. 그래서 더 적은 잡음으로 더
          깊은 대화를 시작할 수 있습니다.
        </p>
      </div>
      <div class="grid gap-4 lg:grid-cols-3">
        {#each inviteFlow as step}
          <article class="surface-panel space-y-4">
            <div class="flex items-center gap-3">
              <span class="badge-step">{step.label}</span>
              <h3 class="text-xl">{step.title}</h3>
            </div>
            <p class="text-sm leading-6 text-peer-copySoft">{step.copy}</p>
          </article>
        {/each}
      </div>
    </section>

    <section class="surface-panel-strong flex flex-col gap-5 text-center sm:text-left">
      <div class="space-y-3">
        <p class="section-kicker text-peer-paper/70">지금 시작하기</p>
        <h2 class="headline-balance text-4xl text-peer-paper">
          혼자 찾기 어려운 동료를 더 정확하게 만나보세요
        </h2>
        <p class="max-w-2xl text-base leading-7 text-peer-paper/75">
          Peer Connect는 신뢰를 기반으로 대화가 시작되는 개발자 네트워크를 지향합니다.
        </p>
      </div>
      <div class="flex flex-wrap justify-center gap-3 sm:justify-start">
        <button class="btn btn-primary" type="button" onclick={handleGoogleSignIn}>
          <span>Peer Connect 시작하기</span>
          <ArrowRight class="h-4 w-4" />
        </button>
      </div>
    </section>
  {/if}
</main>

{#if inviteePrompt}
  <div class="fixed inset-0 z-30 flex items-center justify-center bg-peer-ink/55 px-5">
    <div
      class="w-full max-w-lg rounded-[28px] border border-peer-stone bg-white p-8 shadow-panelLg"
    >
      <p class="section-kicker">새로운 연결</p>
      <h2 class="mt-2 text-3xl">내 초대로 동료가 합류했습니다</h2>
      <p class="mt-3 text-base leading-7 text-peer-copySoft">
        {inviteePrompt.inviteeName ?? '새 동료'}님에게 추천서를 남겨보시겠어요?
      </p>
      <form
        method="post"
        action="?/acknowledgeInviteePrompt"
        class="mt-6 flex flex-wrap items-center gap-3"
        onsubmit={handleAcknowledgeSubmit}
      >
        <input type="hidden" name="redemptionId" value={inviteePrompt.redemptionId} />
        <input
          type="hidden"
          name="next"
          value={`/members/${inviteePrompt.inviteeUserId}?endorsementStatus=prompt`}
        />
        <button
          type="submit"
          name="intent"
          value="visit"
          class="btn btn-primary"
          disabled={acknowledgeSubmittingIntent !== null}
        >
          {#if acknowledgeSubmittingIntent === 'visit'}
            <span>이동 중...</span>
          {:else}
            추천 남기러 가기
          {/if}
        </button>
        <button
          type="submit"
          name="intent"
          value="dismiss"
          class="btn btn-secondary"
          disabled={acknowledgeSubmittingIntent !== null}
        >
          {#if acknowledgeSubmittingIntent === 'dismiss'}
            <span>처리 중...</span>
          {:else}
            나중에 하기
          {/if}
        </button>
      </form>
    </div>
  </div>
{/if}
