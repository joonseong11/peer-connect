<script lang="ts">
  import type { Session } from '@supabase/supabase-js';
  import { page } from '$app/stores';
  import { derived } from 'svelte/store';
  import { ArrowUpRight, LayoutGrid, LogOut, UserRound } from 'lucide-svelte';

  const { session, invitesEnabled = false } = $props<{
    session: Session | null;
    invitesEnabled?: boolean;
  }>();

  const authedNavItems = [
    { href: '/', label: '홈', match: (path: string) => path === '/' },
    { href: '/members', label: '멤버', match: (path: string) => path.startsWith('/members') },
    { href: '/gatherings', label: '모임', match: (path: string) => path.startsWith('/gatherings') },
    ...(invitesEnabled
      ? [{ href: '/invite', label: '초대', match: (path: string) => path.startsWith('/invite') }]
      : []),
    {
      href: '/mypage',
      label: '내 활동',
      match: (path: string) => path.startsWith('/mypage') || path.startsWith('/profile')
    }
  ];

  const guestNavItems = [
    { href: '/#why-peer-connect', label: '왜 Peer Connect인가' },
    { href: '/#members-preview', label: '멤버' },
    { href: '/#gatherings-preview', label: '모임' },
    { href: '/#invitation-model', label: '운영 방식' }
  ];

  const loginActionStore = derived(page, ($page) => {
    const current = $page.url;
    const authRedirectParam = current.searchParams.get('authRedirect');
    const normalizedAuthRedirect = authRedirectParam?.startsWith('/') ? authRedirectParam : null;
    const inviteWithCode =
      current.pathname === '/invite' && current.searchParams.get('code')
        ? `${current.pathname}${current.search}`
        : null;
    const target = normalizedAuthRedirect ?? inviteWithCode;
    return target ? `/auth/login?next=${encodeURIComponent(target)}` : '/auth/login';
  });
</script>

<header class="sticky top-0 z-20 border-b border-peer-stone/90 bg-peer-paper/90 backdrop-blur-xl">
  <div class="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-4 sm:px-8 lg:px-10">
    <a class="min-w-0 shrink-0 text-peer-ink no-underline" href="/">
      <div class="flex items-center gap-3">
        <span
          class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-peer-ink text-sm font-semibold text-peer-paper"
        >
          PC
        </span>
        <div class="hidden min-w-0 sm:block">
          <p class="font-display text-lg font-semibold tracking-[-0.01em] text-peer-ink">
            Peer Connect
          </p>
          <p class="text-[11px] uppercase tracking-[0.18em] text-peer-copyMuted">
            초대 기반 개발자 네트워크
          </p>
        </div>
      </div>
    </a>

    <nav class="hidden flex-1 items-center justify-center gap-2 lg:flex">
      {#if session}
        {#each authedNavItems as item}
          <a
            href={item.href}
            class={`rounded-full px-4 py-2 text-sm font-medium transition ${
              item.match($page.url.pathname)
                ? 'bg-white text-peer-ink shadow-panel'
                : 'text-peer-copySoft hover:bg-white/70 hover:text-peer-ink'
            }`}
          >
            {item.label}
          </a>
        {/each}
      {:else}
        {#each guestNavItems as item}
          <a
            href={item.href}
            class="rounded-full px-4 py-2 text-sm font-medium text-peer-copySoft transition hover:bg-white/70 hover:text-peer-ink"
          >
            {item.label}
          </a>
        {/each}
      {/if}
    </nav>

    <div class="ml-auto flex items-center gap-2 sm:gap-3">
      {#if session}
        <a
          class="hidden items-center gap-2 rounded-full border border-peer-stone bg-white px-4 py-2 text-sm font-medium text-peer-copy shadow-panel transition hover:border-peer-stoneDark hover:text-peer-ink md:inline-flex"
          href="/mypage"
        >
          <LayoutGrid class="h-4 w-4" />
          <span>내 활동</span>
        </a>
        <a
          class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-peer-stone bg-white text-peer-copy shadow-panel transition hover:border-peer-stoneDark hover:text-peer-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-peer-forest/10"
          href="/mypage"
          title="내 프로필과 활동"
        >
          <UserRound class="h-4 w-4" />
        </a>
        <form method="post" action="/auth/signout" class="m-0">
          <button
            type="submit"
            class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-peer-stone bg-white text-peer-copy shadow-panel transition hover:border-peer-danger hover:text-peer-danger focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-peer-danger/10"
            title="로그아웃"
          >
            <LogOut class="h-4 w-4" />
          </button>
        </form>
      {:else}
        <form method="post" action={$loginActionStore} class="m-0">
          <button type="submit" class="btn btn-primary px-4 sm:px-5">
            <span>Google로 시작하기</span>
            <ArrowUpRight class="h-4 w-4" />
          </button>
        </form>
      {/if}
    </div>
  </div>
</header>
