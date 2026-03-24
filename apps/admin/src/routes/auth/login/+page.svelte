<script lang="ts">
  let { data, form } = $props();

  const alertMessage = form?.message ?? data.errorMessage;
  const alertTone = form?.mode === 'devMagicLink' || data.errorMessage ? 'amber' : 'rose';
</script>

<svelte:head>
  <title>Peer Connect Admin Login</title>
</svelte:head>

<div class="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.16),_transparent_42%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)]">
  <div class="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-10">
    <div class="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section class="rounded-[28px] bg-peer-ink px-8 py-10 text-white shadow-2xl shadow-peer-ink/20">
        <p class="mb-4 inline-flex rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-white/70">
          Peer Connect Admin
        </p>
        <h1 class="max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
          운영자 전용 데이터와 권한을 관리하는 별도 콘솔입니다.
        </h1>
        <p class="mt-5 max-w-xl text-base leading-7 text-white/72">
          일반 사용자용 웹앱과 분리된 SvelteKit admin 앱이며, 로그인 후에도
          <code class="rounded bg-white/10 px-1.5 py-0.5 text-sm">profiles.is_admin = true</code>
          인 계정만 접근할 수 있습니다.
        </p>

        <div class="mt-10 grid gap-4 sm:grid-cols-2">
          <div class="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p class="text-sm font-medium text-white/80">주요 기능</p>
            <ul class="mt-3 space-y-2 text-sm text-white/65">
              <li>멤버 목록 및 관리자 권한 토글</li>
              <li>초대, 추천서, 블로그, 모임 데이터 조회</li>
              <li>운영용 대시보드 통계 확인</li>
            </ul>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p class="text-sm font-medium text-white/80">현재 로그인 방식</p>
            <ul class="mt-3 space-y-2 text-sm text-white/65">
              <li>기본: 이메일 + 비밀번호</li>
              <li>보조: 기존 Google OAuth 계정 계속 사용 가능</li>
              <li>로컬 dev: 빠른 로그인 지원</li>
            </ul>
          </div>
        </div>

        {#if data.nextPath !== '/'}
          <p class="mt-8 text-sm text-white/55">
            로그인 후
            <code class="rounded bg-white/10 px-1.5 py-0.5 text-xs">{data.nextPath}</code>
            로 이동합니다.
          </p>
        {/if}
      </section>

      <section class="rounded-[28px] bg-white/90 p-6 shadow-2xl shadow-slate-900/10 backdrop-blur sm:p-8">
        <div class="mb-6">
          <h2 class="text-2xl font-semibold text-peer-ink">관리자 로그인</h2>
          <p class="mt-2 text-sm leading-6 text-peer-copySoft">
            자동으로 Google로 보내지 않고, 이 화면에서 운영자 로그인 방식을 선택합니다.
          </p>
        </div>

        {#if alertMessage}
          <div
            class="mb-5 rounded-2xl border px-4 py-3 text-sm {alertTone === 'amber'
              ? 'border-amber-200 bg-amber-50 text-amber-900'
              : 'border-rose-200 bg-rose-50 text-rose-900'}"
          >
            {alertMessage}
          </div>
        {/if}

        <form method="POST" action="?/password" class="space-y-4">
          <input type="hidden" name="next" value={form?.nextPath ?? data.nextPath} />

          <label class="block space-y-2">
            <span class="text-sm font-medium text-peer-ink">이메일</span>
            <input
              name="email"
              type="email"
              autocomplete="email"
              required
              value={form?.passwordEmail ?? ''}
              class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-peer-ink outline-none transition focus:border-peer-forest focus:bg-white"
              placeholder="admin@peer-connect.dev"
            />
          </label>

          <label class="block space-y-2">
            <span class="text-sm font-medium text-peer-ink">비밀번호</span>
            <input
              name="password"
              type="password"
              autocomplete="current-password"
              required
              class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-peer-ink outline-none transition focus:border-peer-forest focus:bg-white"
              placeholder="비밀번호 입력"
            />
          </label>

          <button
            type="submit"
            class="w-full rounded-2xl bg-peer-forest px-4 py-3 text-sm font-medium text-white transition hover:bg-peer-forest/90"
          >
            이메일로 로그인
          </button>
        </form>

        <div class="my-6 flex items-center gap-3">
          <div class="h-px flex-1 bg-slate-200"></div>
          <span class="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">fallback</span>
          <div class="h-px flex-1 bg-slate-200"></div>
        </div>

        <form method="POST" action="?/google">
          <input type="hidden" name="next" value={form?.nextPath ?? data.nextPath} />
          <button
            type="submit"
            class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-peer-ink transition hover:border-slate-300 hover:bg-slate-50"
          >
            기존 Google 계정으로 계속하기
          </button>
        </form>

        {#if data.devAuthEnabled}
          <div class="mt-6 rounded-[24px] border border-dashed border-teal-200 bg-teal-50/80 p-5">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-teal-950">로컬 dev 빠른 로그인</p>
                <p class="mt-1 text-sm leading-6 text-teal-900/80">
                  <code class="rounded bg-white/80 px-1.5 py-0.5 text-xs">localhost</code>
                  에서만 보이며, 서버에서 관리자용 one-time link를 생성해 바로 로그인합니다.
                </p>
              </div>
              <span class="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-teal-700">
                dev only
              </span>
            </div>

            <div class="mt-4 space-y-2">
              {#if data.devAdminCandidates.length > 0}
                {#each data.devAdminCandidates as candidate}
                  <form method="POST" action="?/devMagicLink">
                    <input type="hidden" name="next" value={form?.nextPath ?? data.nextPath} />
                    <input type="hidden" name="email" value={candidate.email} />
                    <button
                      type="submit"
                      class="flex w-full items-center justify-between rounded-2xl border border-teal-200 bg-white px-4 py-3 text-left transition hover:border-teal-300 hover:bg-teal-50"
                    >
                      <span>
                        <span class="block text-sm font-medium text-peer-ink">
                          {candidate.full_name ?? '이름 없음'}
                        </span>
                        <span class="block text-xs text-peer-copySoft">{candidate.email}</span>
                      </span>
                      <span class="text-xs font-medium text-teal-700">빠른 로그인</span>
                    </button>
                  </form>
                {/each}
              {:else}
                <p class="rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm text-teal-950/75">
                  빠른 로그인에 사용할 관리자 이메일이 아직 없습니다.
                </p>
              {/if}
            </div>
          </div>
        {/if}
      </section>
    </div>
  </div>
</div>
