<script lang="ts">
  import { onMount } from 'svelte';
  import { Check, Code, Copy, ImageUp, PencilLine, UserRoundCog, X } from 'lucide-svelte';
  import { fade, scale } from 'svelte/transition';
  import MetaTags from '$lib/components/MetaTags.svelte';
  import type { PageData } from './$types';

  let { data } = $props<{ data: PageData }>();

  const profile = $derived(data.profile);
  const endorsements = $derived(data.endorsements);
  const loadError = $derived(data.loadError);
  const defaultAvatar = '/images/default-profile.svg';

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

    if (profile.contact_blog) {
      items.push({
        label: '블로그',
        value: stripProtocol(profile.contact_blog),
        href: profile.contact_blog,
        external: true
      });
    }

    return items;
  });

  let showBadgeModal = $state(false);
  let copied = $state(false);
  let origin = $state('');

  onMount(() => {
    origin = window.location.origin;
  });

  const badgeUrl = $derived(
    profile && origin ? `${origin}/api/badge/${profile.user_id || profile.id}` : ''
  );
  const badgeLink = $derived(
    profile && origin ? `${origin}/api/badge/${profile.user_id || profile.id}/link` : ''
  );
  const badgeMarkdown = $derived(`[![Peer Connect Profile](${badgeUrl})](${badgeLink})`);

  function copyToClipboard() {
    if (!badgeMarkdown) return;
    navigator.clipboard.writeText(badgeMarkdown);
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 2000);
  }
</script>

<MetaTags
  title="내 프로필 보기 · Peer Connect"
  description="나의 프로필과 동료 추천서를 모아보세요."
  path="/mypage/profile"
  type="website"
/>

{#if !profile}
  <main class="page-shell">
    <section class="section-shell max-w-3xl space-y-4 text-center">
      <h1 class="text-3xl">아직 프로필이 없어요</h1>
      <p class="section-copy">프로필을 작성하면 동료들이 남긴 추천서를 한눈에 볼 수 있습니다.</p>
      <div class="flex flex-wrap justify-center gap-3">
        <a class="btn btn-primary" href="/profile">
          <UserRoundCog class="h-4 w-4" />
          <span>프로필 작성하기</span>
        </a>
        <a class="btn btn-secondary" href="/mypage">마이페이지로 돌아가기</a>
      </div>
    </section>
  </main>
{:else}
  <main class="page-shell">
    <section class="surface-panel-strong grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
      <div class="space-y-5">
        <p class="section-kicker text-peer-paper/70">내 프로필</p>
        <div class="flex items-start gap-4">
          <img
            class="h-20 w-20 rounded-[24px] border border-white/10 bg-white/10 object-cover"
            src={profile.photo_url ?? defaultAvatar}
            alt="내 프로필 이미지"
          />
          <div class="space-y-2">
            <h1 class="headline-balance text-4xl leading-[1.05] text-peer-paper sm:text-5xl">
              {profile.full_name}
            </h1>
            <p class="text-base text-peer-paper/75 sm:text-lg">
              {profile.role || '직군 정보를 추가해주세요'}
            </p>
          </div>
        </div>

        <p class="max-w-3xl text-base leading-7 text-peer-paper/75 sm:text-lg">
          프로필을 최신 상태로 유지하고 동료들이 남긴 추천서를 한곳에서 관리하세요. 이 페이지는
          외부에 공유되는 공개 프로필의 기준점이기도 합니다.
        </p>

        <div class="flex flex-wrap gap-3">
          <a class="btn btn-primary" href="/profile">
            <PencilLine class="h-4 w-4" />
            <span>프로필 수정하기</span>
          </a>
          <a
            class="btn btn-secondary border-white/15 bg-white/10 text-peer-paper hover:bg-white/15"
            href="/mypage/avatar"
          >
            <ImageUp class="h-4 w-4" />
            <span>프로필 사진 변경</span>
          </a>
          <button
            class="btn btn-secondary border-white/15 bg-white/10 text-peer-paper hover:bg-white/15"
            type="button"
            onclick={() => (showBadgeModal = true)}
          >
            <Code class="h-4 w-4" />
            <span>GitHub 배지 받기</span>
          </button>
        </div>

        {#if loadError}
          <p
            class="rounded-[20px] border border-white/10 bg-white/10 px-4 py-3 text-sm text-peer-paper/80"
            role="alert"
          >
            {loadError}
          </p>
        {/if}
      </div>

      <div class="space-y-4 rounded-[24px] border border-white/10 bg-white/10 p-5">
        <div class="space-y-1">
          <p class="meta-line text-peer-paper/60">공개 프로필</p>
          <p class="headline-balance text-xl font-semibold text-peer-paper">
            추천서와 이력을 함께 보여주는 공유 페이지
          </p>
        </div>

        <div class="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          <div class="rounded-[20px] border border-white/10 bg-white/10 p-4">
            <p class="meta-line text-peer-paper/60">받은 추천</p>
            <p class="mt-2 text-2xl font-semibold text-peer-paper">{endorsements.length}개</p>
          </div>
          <div class="rounded-[20px] border border-white/10 bg-white/10 p-4">
            <p class="meta-line text-peer-paper/60">연결 채널</p>
            <p class="mt-2 text-2xl font-semibold text-peer-paper">{contactItems.length}개</p>
          </div>
          <div class="rounded-[20px] border border-white/10 bg-white/10 p-4">
            <p class="meta-line text-peer-paper/60">최근 업데이트</p>
            <p class="mt-2 text-lg font-semibold text-peer-paper">
              {#if profile.updated_at}
                {new Date(profile.updated_at).toLocaleDateString('ko-KR')}
              {:else}
                기록 없음
              {/if}
            </p>
          </div>
        </div>
      </div>
    </section>

    <div class="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
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

        <section class="section-shell space-y-5">
          <div class="space-y-1">
            <p class="section-kicker">추천</p>
            <h2 class="headline-balance text-3xl">동료 추천서</h2>
          </div>

          {#if endorsements.length === 0}
            <div class="empty-panel">
              아직 작성된 추천서가 없습니다. 협업한 동료에게 추천을 요청해보세요.
            </div>
          {:else}
            <div class="space-y-4">
              {#each endorsements as endorsement}
                <article class="surface-panel space-y-4">
                  <header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    {#if endorsement.author}
                      <a
                        class="flex items-center gap-3"
                        href={`/members/${endorsement.author.user_id ?? endorsement.author_id}`}
                      >
                        <img
                          class="h-12 w-12 rounded-[18px] border border-peer-stone bg-peer-paperAlt object-cover"
                          src={endorsement.author.photo_url ?? defaultAvatar}
                          alt={`${endorsement.author.full_name}의 프로필 이미지`}
                        />
                        <div>
                          <span class="block text-sm font-semibold text-peer-ink"
                            >{endorsement.author.full_name}</span
                          >
                          <span class="block text-xs text-peer-copySoft"
                            >{endorsement.author.role ?? '역할 미입력'}</span
                          >
                        </div>
                      </a>
                    {:else}
                      <div class="flex items-center gap-3">
                        <img
                          class="h-12 w-12 rounded-[18px] border border-peer-stone bg-peer-paperAlt object-cover"
                          src={defaultAvatar}
                          alt="알 수 없는 동료의 프로필 이미지"
                        />
                        <div>
                          <span class="block text-sm font-semibold text-peer-copy"
                            >알 수 없는 동료</span
                          >
                          <span class="block text-xs text-peer-copyMuted">역할 미입력</span>
                        </div>
                      </div>
                    {/if}
                    <time class="text-xs text-peer-copyMuted" datetime={endorsement.created_at}>
                      {new Date(endorsement.created_at).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </time>
                  </header>
                  <p class="whitespace-pre-wrap break-words text-sm leading-7 text-peer-copy">
                    {endorsement.content}
                  </p>
                </article>
              {/each}
            </div>
          {/if}
        </section>
      </div>

      <div class="space-y-6">
        <aside class="section-shell space-y-4">
          <div class="space-y-1">
            <p class="section-kicker">연락처</p>
            <h2 class="text-2xl">연결 채널</h2>
          </div>

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
        </aside>

        <aside class="section-shell space-y-4">
          <div class="space-y-1">
            <p class="section-kicker">빠른 이동</p>
            <h2 class="text-2xl">관련 작업</h2>
          </div>
          <div class="grid gap-3">
            <a
              class="surface-panel-muted no-underline transition hover:border-peer-stoneDark hover:bg-white"
              href="/profile"
            >
              <p class="text-sm font-semibold text-peer-ink">프로필 수정</p>
              <p class="mt-1 text-sm text-peer-copySoft">소개와 커리어를 최신 상태로 유지하세요.</p>
            </a>
            <a
              class="surface-panel-muted no-underline transition hover:border-peer-stoneDark hover:bg-white"
              href="/mypage/avatar"
            >
              <p class="text-sm font-semibold text-peer-ink">프로필 사진 변경</p>
              <p class="mt-1 text-sm text-peer-copySoft">
                외부 공유에 어울리는 대표 이미지를 관리하세요.
              </p>
            </a>
          </div>
        </aside>
      </div>
    </div>
  </main>
{/if}

{#if showBadgeModal && profile}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    transition:fade={{ duration: 200 }}
  >
    <div
      class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      onclick={() => (showBadgeModal = false)}
      role="button"
      tabindex="0"
      onkeydown={(e) => e.key === 'Escape' && (showBadgeModal = false)}
      aria-label="Close modal"
    ></div>
    <div
      class="relative w-full max-w-2xl overflow-hidden rounded-[28px] bg-white shadow-panelLg ring-1 ring-black/5"
      role="dialog"
      aria-modal="true"
      transition:scale={{ start: 0.95, duration: 200 }}
    >
      <div
        class="flex items-center justify-between border-b border-peer-stone bg-peer-paperAlt px-6 py-4"
      >
        <h3 class="text-lg font-semibold text-peer-ink">GitHub 프로필 배지</h3>
        <button
          class="rounded-full p-1 text-peer-copyMuted transition hover:bg-white hover:text-peer-copy"
          onclick={() => (showBadgeModal = false)}
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <div class="space-y-6 p-6">
        <div class="space-y-2">
          <p class="text-sm font-medium text-peer-copy">미리보기</p>
          <div
            class="flex items-center justify-center rounded-[20px] border border-peer-stone bg-peer-paperAlt p-6"
          >
            <img
              src={badgeUrl}
              alt="Peer Connect Badge Preview"
              class="max-w-full rounded-lg shadow-sm"
            />
          </div>
        </div>

        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-peer-copy">마크다운 코드</p>
            <span class="text-xs text-peer-copyMuted">GitHub README.md에 붙여넣으세요</span>
          </div>
          <div class="relative group">
            <pre
              class="w-full overflow-x-auto rounded-[20px] border border-peer-stone bg-slate-900 p-4 text-sm text-slate-300 font-mono scrollbar-hide">{badgeMarkdown}</pre>
            <button
              class="absolute right-2 top-2 flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30"
              onclick={copyToClipboard}
            >
              {#if copied}
                <Check class="h-3.5 w-3.5" />
                <span>복사됨</span>
              {:else}
                <Copy class="h-3.5 w-3.5" />
                <span>코드 복사</span>
              {/if}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
