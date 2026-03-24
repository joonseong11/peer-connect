<script lang="ts">
  import { CalendarDays, PencilLine, Sparkles } from 'lucide-svelte';
  import MetaTags from '$lib/components/MetaTags.svelte';
  import type { ActionData, PageData } from './$types';

  const { data, form } = $props<{ data: PageData; form: ActionData }>();

  const values = $derived<Record<string, string>>(
    form?.values ?? {
      title: '',
      content: ''
    }
  );

  const fieldError = (field: 'title' | 'content') => form?.errors?.[field] ?? null;
  const serverMessage = $derived(form?.serverMessage ?? null);

  let createSubmitting = $state(false);
  let handledForm: ActionData | null = null;

  $effect(() => {
    if (form !== handledForm) {
      handledForm = form ?? null;
      createSubmitting = false;
    }
  });

  const handleCreateSubmit = () => {
    createSubmitting = true;
  };
</script>

<MetaTags
  title="모임 글쓰기 · Peer Connect"
  description="Peer Connect 멤버들과 함께하는 다양한 모임을 만들고 공유해보세요."
  path="/gatherings/new"
  type="website"
/>

<main class="page-shell">
  <section class="surface-panel-strong grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
    <div class="space-y-5">
      <a
        class="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-peer-paper/70 transition hover:bg-white/15 hover:text-peer-paper hover:no-underline"
        href="/gatherings"
      >
        <span aria-hidden="true">←</span>
        모임 라운지
      </a>
      <div class="space-y-3">
        <p class="section-kicker text-peer-paper/70">모임 작성</p>
        <h1 class="headline-balance max-w-3xl text-4xl leading-[1.05] text-peer-paper sm:text-5xl">
          새로운 대화를 여는 모임을 만들어보세요
        </h1>
        <p class="max-w-2xl text-base leading-7 text-peer-paper/75 sm:text-lg">
          모임의 목적과 진행 방식을 분명하게 적어두면, 잘 맞는 사람이 더 빠르게 참여를 결정할 수
          있습니다.
        </p>
      </div>
    </div>

    <aside class="space-y-4 rounded-[24px] border border-white/10 bg-white/10 p-5">
      <div class="flex items-center gap-3">
        <div
          class="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-white/10 text-peer-paper"
        >
          <CalendarDays class="h-6 w-6" />
        </div>
        <div>
          <p class="meta-line text-peer-paper/60">작성 가이드</p>
          <p class="text-xl font-semibold text-peer-paper">참여 판단이 쉬운 모임 글이 좋습니다</p>
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
        <div class="rounded-[20px] border border-white/10 bg-white/10 p-4">
          <p class="meta-line text-peer-paper/60">무엇을 하는지</p>
          <p class="mt-2 text-sm leading-6 text-peer-paper/75">
            커피챗인지, 스터디인지, 함께 만드는 자리인지 첫 문장에서 드러내세요.
          </p>
        </div>
        <div class="rounded-[20px] border border-white/10 bg-white/10 p-4">
          <p class="meta-line text-peer-paper/60">누가 오면 좋은지</p>
          <p class="mt-2 text-sm leading-6 text-peer-paper/75">
            어떤 사람에게 잘 맞는 모임인지 간단히 적어두면 참여 판단이 빨라집니다.
          </p>
        </div>
        <div class="rounded-[20px] border border-white/10 bg-white/10 p-4">
          <p class="meta-line text-peer-paper/60">어떻게 참여하는지</p>
          <p class="mt-2 text-sm leading-6 text-peer-paper/75">
            준비물이나 신청 방식을 본문 앞부분에 적어두면 불필요한 질문이 줄어듭니다.
          </p>
        </div>
      </div>
    </aside>
  </section>

  <div class="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
    <section class="section-shell space-y-6">
      <div class="space-y-1">
        <p class="section-kicker">모임 내용 작성</p>
        <h2 class="headline-balance text-3xl">모임 공유하기</h2>
        <p class="section-copy">
          아래 정보만 잘 정리해도 읽는 사람이 “이 모임이 나와 맞는지”를 금방 판단할 수 있습니다.
        </p>
      </div>

      <form class="space-y-5" method="post" action="?/create" onsubmit={handleCreateSubmit}>
        <label class="flex flex-col gap-2 text-sm font-medium text-peer-copy">
          <span>제목</span>
          <input
            name="title"
            type="text"
            placeholder="예: 토요일 오후 모각코 함께하실 분"
            required
            value={values.title}
            class="field-shell"
          />
          {#if fieldError('title')}
            <p class="text-sm font-medium text-peer-danger" role="alert">{fieldError('title')}</p>
          {/if}
        </label>

        <label class="flex flex-col gap-2 text-sm font-medium text-peer-copy">
          <span>모임 소개</span>
          <textarea
            name="content"
            rows={8}
            required
            placeholder="모임 목적, 진행 방식, 대상, 준비물, 참가 신청 방법 등을 자세히 작성해주세요."
            class="field-shell min-h-[220px] resize-y">{values.content}</textarea
          >
          <span class="text-xs text-peer-copyMuted">
            예: 어떤 주제로 모이는지, 누가 오면 좋은지, 준비물이 있는지, 댓글로 참여하면 되는지
          </span>
          {#if fieldError('content')}
            <p class="text-sm font-medium text-peer-danger" role="alert">{fieldError('content')}</p>
          {/if}
        </label>

        {#if serverMessage}
          <p class="text-sm font-medium text-peer-danger" role="alert">{serverMessage}</p>
        {/if}

        <div class="flex flex-wrap items-center gap-3 border-t border-peer-stone pt-4">
          <a href="/gatherings" class="btn btn-secondary">취소</a>
          <button type="submit" class="btn btn-primary" disabled={createSubmitting}>
            {#if createSubmitting}
              등록 중…
            {:else}
              등록하기
            {/if}
          </button>
        </div>
      </form>
    </section>

    <aside class="space-y-6">
      <section class="section-shell space-y-4">
        <div class="flex items-center gap-3">
          <div
            class="inline-flex h-11 w-11 items-center justify-center rounded-[18px] bg-peer-paperAlt text-peer-amber"
          >
            <Sparkles class="h-5 w-5" />
          </div>
          <div>
            <p class="section-kicker">좋은 예시</p>
            <h2 class="headline-balance text-2xl">읽기 좋은 모임 글의 흐름</h2>
          </div>
        </div>
        <div class="surface-panel-muted space-y-3">
          <p class="text-sm font-semibold text-peer-ink">토요일 오전 모각코 함께하실 분</p>
          <p class="text-sm leading-7 text-peer-copySoft">
            이번 주 토요일 오전 10시부터 1시까지 온라인으로 각자 작업하는 모각코를 열어보려 합니다.
            프론트엔드/백엔드 상관없이 혼자 집중할 시간이 필요한 분이면 누구나 환영합니다.
          </p>
        </div>
      </section>

      <section class="section-shell space-y-4">
        <div class="flex items-center gap-3">
          <div
            class="inline-flex h-11 w-11 items-center justify-center rounded-[18px] bg-peer-paperAlt text-peer-forest"
          >
            <PencilLine class="h-5 w-5" />
          </div>
          <div>
            <p class="section-kicker">체크 포인트</p>
            <h2 class="headline-balance text-2xl">게시 전에 한 번만 확인하세요</h2>
          </div>
        </div>
        <ul class="space-y-3 text-sm leading-7 text-peer-copySoft">
          <li>제목에서 모임 성격이 바로 읽히는지</li>
          <li>대상과 참여 방식이 본문 앞부분에 있는지</li>
          <li>댓글로 참여하면 되는지, 별도 준비물이 있는지 적었는지</li>
        </ul>
      </section>
    </aside>
  </div>
</main>
