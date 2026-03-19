<script lang="ts">
  import { page } from '$app/stores';
  import { Sparkles, Ticket } from 'lucide-svelte';
  import '../app.css';
  import AppHeader from '$lib/components/AppHeader.svelte';
  import BottomNav from '$lib/components/BottomNav.svelte';

  let { children, data } = $props();

  const shouldShowInviteGate = $derived.by(() => {
    if (!data?.inviteGateActive) {
      return false;
    }

    const pathname = $page.url.pathname;

    if (pathname.startsWith('/auth')) return false;
    if (pathname.startsWith('/invite')) return false;
    if (pathname.startsWith('/profile')) return false;
    if (pathname.startsWith('/privacy')) return false;
    if (pathname.startsWith('/claim')) return false;
    if (pathname === '/members') return false;
    if (pathname.startsWith('/members/')) return false;

    return true;
  });

  const publicProfileHref = $derived.by(() => {
    const userId = data?.session?.user?.id;
    return userId ? `/members/${userId}` : '/';
  });
</script>

<div class="flex min-h-screen flex-col">
  <AppHeader session={data?.session ?? null} invitesEnabled={data?.invitesEnabled ?? false} />

  <div class="relative flex flex-1 flex-col">
    <div
      aria-hidden={shouldShowInviteGate}
      inert={shouldShowInviteGate}
      class:blur-[4px]={shouldShowInviteGate}
      class:pointer-events-none={shouldShowInviteGate}
      class:select-none={shouldShowInviteGate}
    >
      {@render children()}
    </div>

    {#if shouldShowInviteGate}
      <div class="fixed inset-0 z-50">
        <div class="absolute inset-0 bg-peer-paper/55 backdrop-blur-[2px]"></div>
        <div class="absolute inset-0 flex items-center justify-center overflow-y-auto p-6">
          <section class="section-shell pointer-events-auto max-w-lg text-center shadow-panelLg">
            <div
              class="mx-auto flex h-12 w-12 items-center justify-center rounded-[18px] bg-peer-paperAlt text-peer-amber"
            >
              <Ticket class="h-6 w-6" />
            </div>
            <p class="mt-4 section-kicker">초대 코드 필요</p>
            <h2 class="mt-2 headline-balance text-3xl">초대 코드를 연결하면 이 공간이 열립니다</h2>
            <p class="mt-3 text-sm leading-7 text-peer-copySoft">
              Peer Connect는 초대 기반으로 운영됩니다. 코드 연결을 완료하면 홈, 모임, 내 활동 공간을
              자유롭게 둘러볼 수 있습니다.
            </p>
            <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
              <a class="btn btn-primary" href="/invite">초대 코드 입력하기</a>
              <a class="btn btn-secondary" href={publicProfileHref}>공개 프로필 보기</a>
            </div>
            <div
              class="mt-4 rounded-[20px] border border-peer-stone bg-peer-paperAlt px-4 py-3 text-sm text-peer-copySoft"
            >
              공개 프로필 페이지는 계속 확인할 수 있습니다.
            </div>
          </section>
        </div>
      </div>
    {/if}
  </div>

  {#if data?.session}
    <BottomNav />
  {/if}

  <footer class="border-t border-peer-stone/90 bg-peer-paper/90 pb-16 lg:pb-0">
    <div class="mx-auto max-w-6xl px-4 pb-8 pt-7 sm:px-8 lg:px-10">
      <div class="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div class="space-y-1">
          <p class="font-display text-lg font-semibold tracking-[-0.01em] text-peer-ink">
            Peer Connect
          </p>
          <p class="text-sm text-peer-copySoft">
            초대 기반으로 신뢰를 쌓아가는 프라이빗 개발자 네트워크
          </p>
        </div>
        <div class="flex items-center gap-4 text-sm text-peer-copySoft">
          <a class="transition hover:text-peer-ink" href="/privacy">개인정보처리방침</a>
          <a class="transition hover:text-peer-ink" href="/#invitation-model">운영 방식</a>
        </div>
      </div>
    </div>
  </footer>
</div>
