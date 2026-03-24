<script lang="ts">
  import MetaTags from '$lib/components/MetaTags.svelte';
  import type { ActionData, PageData } from './$types';

  const { data, form } = $props<{ data: PageData; form: ActionData }>();

  const preview = $derived(data.preview);
  const claimError = $derived(form?.claimError ?? null);
  const statusMessage = $derived(data.statusMessage ?? null);
  const message = $derived(claimError ?? statusMessage);
</script>

<MetaTags
  title="추천서 받기 · Peer Connect"
  description="전달받은 추천 링크로 Peer Connect 추천서를 내 계정에 연결하세요."
  path={`/claim/${data.token}`}
  type="website"
/>

<main class="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 pb-16 pt-14 sm:px-8">
  <section class="surface-panel-strong space-y-4 text-peer-paper">
    <p class="section-kicker text-peer-paper/70">추천서 받기</p>
    <h1 class="headline-balance text-4xl text-peer-paper sm:text-5xl">추천서를 내 계정으로 받기</h1>
    <p class="max-w-2xl text-sm leading-7 text-peer-paper/75 sm:text-base">
      전달받은 링크로 추천서를 수령하면 Peer Connect 내 프로필에 바로 연결되고, 초대 코드 입력 없이
      서비스를 이어서 사용할 수 있습니다.
    </p>
  </section>

  {#if message}
    <section class="glass-panel space-y-3">
      <h2 class="text-xl font-semibold text-peer-navy">상태 안내</h2>
      <p
        class={`rounded-2xl px-4 py-3 text-sm font-medium ${
          claimError
            ? 'border border-rose-200 bg-rose-50 text-rose-600'
            : 'border border-slate-200 bg-slate-50 text-slate-600'
        }`}
        role="status"
      >
        {message}
      </p>
      <a class="btn btn-secondary" href="/"> 홈으로 돌아가기 </a>
    </section>
  {/if}

  {#if preview?.state === 'active'}
    <section class="glass-panel space-y-5">
      <header class="space-y-2">
        <p class="section-kicker">추천 링크</p>
        <h2 class="text-3xl font-semibold text-peer-navy">
          {preview.authorName}님이 추천서를 보냈습니다
        </h2>
        <p class="text-sm leading-6 text-slate-600">
          추천서 전문은 로그인 후 내 계정으로 연결될 때 표시됩니다. 링크를 받은 본인만 진행해
          주세요.
        </p>
      </header>

      <div
        class="rounded-[24px] border border-amber-300/60 bg-amber-50 px-5 py-5 text-sm leading-6 text-amber-900"
      >
        <p class="font-semibold">중요 안내</p>
        <p class="mt-2">
          이 링크를 전달받은 사람이 아니라면 진행하지 마세요. 타인을 대신해 추천서를 수령하는 경우
          추천서 회수, 연결 해제, 서비스 이용 제한 또는 별도 통지 없는 계정 삭제 등 불이익이 있을 수
          있습니다.
        </p>
      </div>

      <div
        class="rounded-[24px] border border-slate-200/70 bg-white/90 px-5 py-4 text-sm text-slate-600"
      >
        <p>
          링크 만료일:
          <span class="ml-2 font-semibold text-peer-navy">
            {new Date(preview.expiresAt).toLocaleString('ko-KR')}
          </span>
        </p>
        <p class="mt-2">
          현재 상태:
          <span class="ml-2 font-semibold text-peer-navy">
            {data.session ? '로그인됨' : '로그인 또는 회원가입 필요'}
          </span>
        </p>
      </div>

      <form method="post" action="?/claim" class="space-y-4">
        <label
          class="flex items-start gap-3 rounded-[24px] border border-slate-200/70 bg-slate-50/90 px-4 py-4 text-sm leading-6 text-slate-700"
        >
          <input
            class="mt-1 h-4 w-4 rounded border-slate-300 text-peer-indigo focus:ring-peer-indigo/40"
            type="checkbox"
            name="warningAccepted"
            value="true"
            required
          />
          <span>{data.warningLabel}</span>
        </label>

        <button type="submit" class="btn btn-primary">
          {#if data.session}
            추천서 받기
          {:else}
            로그인하고 추천서 받기
          {/if}
        </button>
      </form>
    </section>
  {/if}
</main>
