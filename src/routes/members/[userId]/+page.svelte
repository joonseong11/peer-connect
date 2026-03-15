<script lang="ts">
  import { page } from '$app/stores';
  import { ArrowRight, CalendarDays, Sparkles, UserRound } from 'lucide-svelte';
  import MetaTags from '$lib/components/MetaTags.svelte';
  import type { ActionData, PageData } from './$types';

  const { data, form } = $props<{ data: PageData; form: ActionData }>();

  const profile = $derived(data.profile);
  const endorsements = $derived(data.endorsements);
  const recentGatherings = $derived(data.recentGatherings ?? []);
  const existingEndorsementId = $derived(data.existingEndorsementId);
  const statusMessage = $derived(data.statusMessage);
  const loadError = $derived(data.loadError);
  const session = $derived(data.session);
  const defaultAvatar = '/images/default-profile.svg';
  const values = $derived<Record<string, string>>(form?.values ?? { content: '' });
  const contentError = $derived(form?.errors?.content ?? null);
  const serverMessage = $derived(form?.serverMessage ?? null);
  const deleteError = $derived(form?.deleteError ?? null);
  const endorsementCount = $derived(endorsements.length);
  const canViewContact = $derived(Boolean(session));
  const backHref = $derived(session ? '/members' : '/');
  const backLabel = $derived(session ? '멤버 목록' : '홈');

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

  const trustTags = $derived.by(() => {
    if (!profile) {
      return [];
    }

    const derivedRoleTags = (profile.role ?? '')
      .split(/[·,/]/)
      .map((token: string) => token.trim())
      .filter(Boolean)
      .slice(0, 2);

    return [...derivedRoleTags];
  });

  const formatDate = (value: string | null | undefined) =>
    value
      ? new Date(value).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      : '정보 없음';
</script>

<MetaTags
  title={metaTitle}
  description={metaDescription}
  image={metaImage}
  path={metaPath}
  type="article"
/>

{#if !profile}
  <main class="page-shell">
    <section class="section-shell max-w-3xl space-y-4 text-center">
      <h1 class="text-3xl">프로필 정보를 찾을 수 없습니다.</h1>
      <p class="section-copy">초대 링크가 만료되었거나 프로필이 삭제되었을 수 있어요.</p>
      <div class="flex justify-center">
        <a class="btn btn-primary" href={session ? '/members' : '/'}>돌아가기</a>
      </div>
    </section>
  </main>
{:else}
  <main class="page-shell">
    <section class="surface-panel-strong grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
      <div class="space-y-5">
        <a
          class="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-peer-paper/70 transition hover:bg-white/15 hover:text-peer-paper hover:no-underline"
          href={backHref}
        >
          <span aria-hidden="true">←</span>
          {backLabel}
        </a>

        <div class="flex items-start gap-4">
          <img
            class="h-20 w-20 rounded-[24px] border border-white/10 bg-white/10 object-cover"
            src={profile.photo_url ?? defaultAvatar}
            alt={`${profile.full_name} 프로필 이미지`}
          />
          <div class="space-y-2">
            <p class="section-kicker text-peer-paper/70">프로필</p>
            <h1 class="headline-balance text-4xl leading-[1.05] text-peer-paper sm:text-5xl">
              {profile.full_name}
            </h1>
            <p class="text-base text-peer-paper/75 sm:text-lg">{profile.role}</p>
          </div>
        </div>

        <p class="max-w-3xl text-base leading-7 text-peer-paper/75 sm:text-lg">
          {profile.introduction || '아직 소개가 작성되지 않았습니다.'}
        </p>

        <div class="flex flex-wrap gap-3">
          <div class="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm">
            추천 {endorsementCount}개
          </div>
          <div class="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm">
            최근 개설한 모임 {recentGatherings.length}회
          </div>
          {#each trustTags as tag}
            <div class="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm">
              {tag}
            </div>
          {/each}
        </div>

        <div class="flex flex-wrap gap-3">
          {#if session && profile.user_id !== session.user.id && !existingEndorsementId}
            <a class="btn btn-primary" href="#endorsement-composer">
              <span>추천 남기기</span>
              <ArrowRight class="h-4 w-4" />
            </a>
          {:else if !session}
            <a
              class="btn btn-primary"
              href={`/auth/login?next=${encodeURIComponent($page.url.pathname)}`}
            >
              <span>로그인하고 추천 남기기</span>
              <ArrowRight class="h-4 w-4" />
            </a>
          {/if}

          {#if canViewContact && contactItems.length > 0}
            <a
              class="btn btn-secondary border-white/15 bg-white/10 text-peer-paper hover:bg-white/15"
              href="#contact-panel"
            >
              연락처 보기
            </a>
          {/if}
        </div>

        {#if statusMessage}
          <p
            class="rounded-[20px] border border-white/10 bg-white/10 px-4 py-3 text-sm text-peer-paper/80"
            role="status"
          >
            {statusMessage}
          </p>
        {/if}
        {#if loadError}
          <p
            class="rounded-[20px] border border-white/10 bg-white/10 px-4 py-3 text-sm text-peer-paper/80"
            role="alert"
          >
            {loadError}
          </p>
        {/if}
        {#if !session}
          <p
            class="rounded-[20px] border border-white/10 bg-white/10 px-4 py-3 text-sm text-peer-paper/80"
          >
            이 페이지는 추천서와 주요 이력을 확인할 수 있는 공개 프로필입니다.
          </p>
        {/if}
      </div>

      <div class="space-y-4 rounded-[24px] border border-white/10 bg-white/10 p-5">
        <div class="flex items-center gap-3">
          <div
            class="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-white/10 text-peer-paper"
          >
            <UserRound class="h-6 w-6" />
          </div>
          <div>
            <p class="meta-line text-peer-paper/60">핵심 정보</p>
            <p class="headline-balance text-xl font-semibold text-peer-paper">
              한눈에 보는 프로필 요약
            </p>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          <div class="rounded-[20px] border border-white/10 bg-white/10 p-4">
            <p class="meta-line text-peer-paper/60">추천</p>
            <p class="mt-2 text-2xl font-semibold text-peer-paper">{endorsementCount}개</p>
          </div>
          <div class="rounded-[20px] border border-white/10 bg-white/10 p-4">
            <p class="meta-line text-peer-paper/60">최근 개설한 모임</p>
            <p class="mt-2 text-2xl font-semibold text-peer-paper">{recentGatherings.length}회</p>
          </div>
          <div class="rounded-[20px] border border-white/10 bg-white/10 p-4">
            <p class="meta-line text-peer-paper/60">최근 업데이트</p>
            <p class="mt-2 text-lg font-semibold text-peer-paper">
              {formatDate(profile.updated_at)}
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
      <div class="space-y-6">
        <section class="section-shell space-y-3">
          <div class="space-y-1">
            <p class="section-kicker">소개</p>
            <h2 class="headline-balance text-3xl">소개</h2>
          </div>
          <p class="text-sm leading-7 text-peer-copySoft">
            {profile.introduction || '아직 소개가 작성되지 않았습니다.'}
          </p>
        </section>

        <section class="section-shell space-y-4">
          <div class="space-y-1">
            <p class="section-kicker">커리어</p>
            <h2 class="headline-balance text-3xl">커리어 및 교육</h2>
          </div>
          {#if profile.career_history}
            <ul class="space-y-3">
              {#each profile.career_history.split('\n').filter(Boolean) as line}
                <li
                  class="flex gap-3 rounded-[18px] border border-peer-stone bg-peer-paperAlt px-4 py-3"
                >
                  <span class="mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-peer-forest"
                  ></span>
                  <span class="text-sm leading-6 text-peer-copy">{line}</span>
                </li>
              {/each}
            </ul>
          {:else}
            <div class="empty-panel">커리어 및 교육 요약이 비어 있어요.</div>
          {/if}
        </section>

        <section id="endorsement-composer" class="section-shell space-y-5">
          <header class="space-y-2">
            <p class="section-kicker">추천</p>
            <h2 class="headline-balance text-3xl">동료 추천</h2>
            <p class="section-copy">
              함께 일한 맥락을 남겨주세요. 좋았던 협업 방식이나 인상 깊었던 장면을 구체적으로
              적어주면 더 큰 도움이 됩니다.
            </p>
          </header>

          {#if existingEndorsementId}
            <div
              class="rounded-[20px] border border-peer-amber/20 bg-peer-amberSoft px-4 py-4 text-sm font-medium text-peer-amber"
            >
              이미 이 동료에게 추천을 남겼습니다. 다시 작성하려면 아래에서 기존 추천을 삭제해주세요.
            </div>
          {:else if session && profile.user_id === session?.user.id}
            <div class="empty-panel">내 프로필에는 추천을 남길 수 없습니다.</div>
          {:else if !session}
            <div class="surface-panel-muted space-y-3 text-center">
              <p class="text-sm font-medium text-peer-copy">
                추천 작성은 Peer Connect 멤버만 가능합니다.
              </p>
            </div>
          {:else}
            <form method="post" action="?/endorse" class="space-y-4" onsubmit={handleEndorseSubmit}>
              <label class="flex flex-col gap-2 text-sm font-medium text-peer-copy">
                <span>추천 내용 (최소 20자)</span>
                <textarea
                  name="content"
                  rows={6}
                  required
                  minlength={20}
                  placeholder="어떤 상황에서 이 동료가 빛났는지, 함께 일하며 무엇을 배웠는지 구체적으로 작성해주세요."
                  class="field-shell min-h-[168px] resize-y">{values.content}</textarea
                >
              </label>
              {#if contentError}
                <p class="text-sm font-medium text-peer-danger" role="alert">{contentError}</p>
              {/if}
              {#if serverMessage}
                <p class="text-sm font-medium text-peer-danger" role="alert">{serverMessage}</p>
              {/if}
              <button type="submit" class="btn btn-primary" disabled={endorseSubmitting}>
                {#if endorseSubmitting}
                  <span>등록 중...</span>
                {:else}
                  추천 남기기
                {/if}
              </button>
            </form>
          {/if}
        </section>

        <section id="endorsement-feed" class="section-shell space-y-5">
          <div class="space-y-1">
            <p class="section-kicker">Endorsement Feed</p>
            <h2 class="text-3xl">동료 추천 목록</h2>
          </div>

          {#if endorsements.length === 0}
            <div class="empty-panel">아직 작성된 추천이 없습니다. 첫 번째 추천을 남겨보세요.</div>
          {:else}
            <div class="space-y-4">
              {#each endorsements as endorsement}
                <article class="surface-panel space-y-4">
                  <header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div class="flex items-center gap-3">
                      <img
                        class="h-12 w-12 rounded-[18px] border border-peer-stone bg-peer-paperAlt object-cover"
                        src={endorsement.author?.photo_url ?? defaultAvatar}
                        alt={`${endorsement.author?.full_name ?? '알 수 없는 동료'} 프로필 이미지`}
                      />
                      <div>
                        <p class="text-sm font-semibold text-peer-ink">
                          {endorsement.author?.full_name ?? '알 수 없는 동료'}
                        </p>
                        <p class="text-xs text-peer-copySoft">
                          {endorsement.author?.role ?? '역할 미입력'}
                        </p>
                      </div>
                    </div>
                    <time class="text-xs text-peer-copyMuted" datetime={endorsement.created_at}>
                      {formatDate(endorsement.created_at)}
                    </time>
                  </header>

                  <p class="whitespace-pre-wrap break-words text-sm leading-7 text-peer-copy">
                    {endorsement.content}
                  </p>

                  {#if endorsement.author_id === session?.user.id}
                    <form
                      method="post"
                      action="?/delete"
                      class="pt-1"
                      onsubmit={() => handleDeleteSubmit(endorsement.id)}
                    >
                      <input type="hidden" name="endorsementId" value={endorsement.id} />
                      <button
                        type="submit"
                        class="btn btn-secondary border-peer-danger/20 bg-peer-dangerSoft px-4 py-2 text-peer-danger hover:border-peer-danger/40"
                        disabled={deleteSubmittingId === endorsement.id}
                      >
                        {#if deleteSubmittingId === endorsement.id}
                          <span>삭제 중...</span>
                        {:else}
                          추천 삭제
                        {/if}
                      </button>
                    </form>
                  {/if}
                </article>
              {/each}
            </div>
          {/if}

          {#if deleteError}
            <p class="text-sm font-medium text-peer-danger" role="alert">{deleteError}</p>
          {/if}
        </section>
      </div>

      <div class="space-y-6">
        <aside id="contact-panel" class="section-shell space-y-4">
          <div class="space-y-1">
            <p class="section-kicker">연락처</p>
            <h2 class="text-2xl">연락처</h2>
          </div>

          {#if canViewContact}
            {#if contactItems.length > 0}
              <ul class="space-y-3">
                {#each contactItems as item}
                  <li>
                    <a
                      class="surface-panel-muted flex flex-col gap-1 no-underline transition hover:border-peer-stoneDark hover:bg-white"
                      href={item.href}
                      target={item.external ? '_blank' : undefined}
                      rel={item.external ? 'noopener noreferrer' : undefined}
                    >
                      <span class="meta-line">{item.label}</span>
                      <span class="break-all text-sm font-medium text-peer-copy">{item.value}</span>
                    </a>
                  </li>
                {/each}
              </ul>
            {:else}
              <div class="empty-panel">공개된 연락처가 아직 없습니다.</div>
            {/if}
          {:else}
            <div class="empty-panel">연락처는 Peer Connect 멤버에게만 공개됩니다.</div>
          {/if}
        </aside>

        <aside class="section-shell space-y-4">
          <div class="flex items-center gap-2 text-peer-amber">
            <Sparkles class="h-4 w-4" />
            <p class="meta-line text-peer-amber">최근 개설한 모임</p>
          </div>
          <h2 class="text-2xl">최근 개설한 모임</h2>
          {#if recentGatherings.length > 0}
            <ul class="space-y-3">
              {#each recentGatherings as gathering}
                <li>
                  <a
                    class="surface-panel-muted flex items-start gap-3 no-underline transition hover:border-peer-stoneDark hover:bg-white"
                    href={`/gatherings/${gathering.id}`}
                  >
                    <div class="mt-0.5 rounded-[14px] bg-peer-paper px-2 py-2 text-peer-forest">
                      <CalendarDays class="h-4 w-4" />
                    </div>
                    <div class="space-y-1">
                      <p class="text-sm font-semibold text-peer-ink">{gathering.title}</p>
                      <p class="text-xs text-peer-copySoft">{formatDate(gathering.created_at)}</p>
                    </div>
                  </a>
                </li>
              {/each}
            </ul>
          {:else}
            <div class="empty-panel">최근 개설한 모임이 아직 없습니다.</div>
          {/if}
        </aside>

        <aside class="section-shell space-y-4">
          <div class="space-y-1">
            <p class="section-kicker">Quick Facts</p>
            <h2 class="text-2xl">프로필 요약</h2>
          </div>
          <div class="grid gap-3">
            <div class="surface-panel-muted space-y-2">
              <p class="meta-line">추천 수</p>
              <p class="text-2xl font-semibold text-peer-ink">{endorsementCount}개</p>
            </div>
            <div class="surface-panel-muted space-y-2">
              <p class="meta-line">최근 개설한 모임</p>
              <p class="text-2xl font-semibold text-peer-ink">{recentGatherings.length}회</p>
            </div>
            <div class="surface-panel-muted space-y-2">
              <p class="meta-line">업데이트</p>
              <p class="text-base font-semibold text-peer-ink">{formatDate(profile.updated_at)}</p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  </main>
{/if}
