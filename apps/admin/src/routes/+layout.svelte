<script lang="ts">
  import '../app.css';
  import {
    LayoutDashboard,
    Users,
    Mail,
    Award,
    BookOpen,
    Calendar,
    LogOut
  } from 'lucide-svelte';

  let { data, children } = $props();

  const navItems = [
    { href: '/', label: '대시보드', icon: LayoutDashboard },
    { href: '/members', label: '멤버', icon: Users },
    { href: '/invites', label: '초대', icon: Mail },
    { href: '/endorsements', label: '추천서', icon: Award },
    { href: '/blog', label: '블로그', icon: BookOpen },
    { href: '/gatherings', label: '모임', icon: Calendar }
  ];
</script>

{#if data.session}
  <div class="flex min-h-screen">
    <!-- Sidebar -->
    <aside class="w-60 bg-peer-ink text-white flex flex-col shrink-0">
      <div class="p-5 border-b border-white/10">
        <h1 class="text-lg font-bold tracking-tight">Peer Connect</h1>
        <span class="text-xs text-white/50">Admin</span>
      </div>

      <nav class="flex-1 p-3 space-y-1">
        {#each navItems as item}
          <a
            href={item.href}
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <item.icon size={18} />
            {item.label}
          </a>
        {/each}
      </nav>

      <div class="p-3 border-t border-white/10">
        <a
          href="/auth/signout"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <LogOut size={18} />
          로그아웃
        </a>
      </div>
    </aside>

    <!-- Main content -->
    <main class="flex-1 p-8">
      {@render children()}
    </main>
  </div>
{:else}
  {@render children()}
{/if}
