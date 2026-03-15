<script lang="ts">
  import '../app.css';
  import AppHeader from '$lib/components/AppHeader.svelte';

  let { children, data } = $props();
</script>

<div class="flex min-h-screen flex-col">
  <AppHeader session={data?.session ?? null} invitesEnabled={data?.invitesEnabled ?? false} />

  <div class="flex flex-1 flex-col">
    {@render children()}
  </div>

  <footer class="border-t border-peer-stone/90 bg-peer-paper/90">
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
