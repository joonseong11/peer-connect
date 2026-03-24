<script lang="ts">
  import { page } from '$app/stores';
  import { Home, Users, CalendarDays, Rss, UserRound } from 'lucide-svelte';

  const items = [
    { href: '/', label: '홈', icon: Home, match: (p: string) => p === '/' },
    { href: '/members', label: '멤버', icon: Users, match: (p: string) => p.startsWith('/members') },
    {
      href: '/gatherings',
      label: '모임',
      icon: CalendarDays,
      match: (p: string) => p.startsWith('/gatherings')
    },
    { href: '/blog', label: '블로그', icon: Rss, match: (p: string) => p.startsWith('/blog') },
    {
      href: '/mypage',
      label: '내 활동',
      icon: UserRound,
      match: (p: string) => p.startsWith('/mypage') || p.startsWith('/profile')
    }
  ];
</script>

<nav
  class="fixed bottom-0 left-0 right-0 z-20 border-t border-peer-stone/90 bg-peer-paper/95 backdrop-blur-xl lg:hidden"
>
  <div class="mx-auto flex max-w-lg items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]">
    {#each items as item}
      {@const active = item.match($page.url.pathname)}
      <a
        href={item.href}
        class="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition
          {active
          ? 'text-peer-forest'
          : 'text-peer-copySoft hover:text-peer-ink'}"
      >
        <item.icon class="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
        <span>{item.label}</span>
      </a>
    {/each}
  </div>
</nav>
