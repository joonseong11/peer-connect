<script lang="ts">
  import { LayoutGrid, Settings2, Sparkles, UserRound } from 'lucide-svelte';
  import MetaTags from '$lib/components/MetaTags.svelte';
  import type { PageData } from './$types';

  const { data } = $props<{ data: PageData }>();

  const profile = $derived(data.profile);
  const invitesEnabled = $derived(data.invitesEnabled);
  const profileLoadError = $derived(data.profileLoadError ?? null);
  const defaultAvatar = '/images/default-profile.svg';

  const hasProfile = $derived(
    Boolean(profile?.full_name?.trim()) &&
      Boolean(profile?.role?.trim()) &&
      Boolean(profile?.introduction?.trim())
  );
</script>

<MetaTags
  title="마이페이지 · Peer Connect"
  description="프로필, 초대, 설정을 모아볼 수 있는 마이페이지 허브입니다."
  path="/mypage"
  type="website"
/>

<main class="page-shell">
  <section class="surface-panel-strong grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
    <div class="space-y-5">
      <p class="section-kicker text-peer-paper/70">마이페이지</p>
      <div class="space-y-3">
        <h1 class="headline-balance max-w-3xl text-4xl leading-[1.05] text-peer-paper sm:text-5xl">
          나의 활동을 한눈에 살펴보세요
        </h1>
        <p class="max-w-2xl text-base leading-7 text-peer-paper/75 sm:text-lg">
          프로필, 초대, 설정을 한 흐름으로 정리했습니다. 필요한 작업을 더 빠르게 찾고 바로 이동할 수
          있습니다.
        </p>
      </div>

      <div class="flex flex-wrap gap-3">
        <div class="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm">
          {hasProfile ? '프로필 준비 완료' : '프로필 보완 필요'}
        </div>
        <div class="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm">
          {#if invitesEnabled}
            초대 기능 사용 가능
          {:else}
            초대 기능 점검 중
          {/if}
        </div>
      </div>

      {#if profileLoadError}
        <p
          class="rounded-[20px] border border-white/10 bg-white/10 px-4 py-3 text-sm text-peer-paper/80"
          role="alert"
        >
          {profileLoadError}
        </p>
      {/if}
    </div>

    <div class="space-y-4 rounded-[24px] border border-white/10 bg-white/10 p-5">
      <div class="flex items-center gap-4">
        <img
          class="h-16 w-16 rounded-[20px] border border-white/10 bg-white/10 object-cover"
          src={profile?.photo_url ?? defaultAvatar}
          alt="내 프로필 썸네일"
        />
        <div class="space-y-1">
          <p class="meta-line text-peer-paper/55">내 프로필</p>
          <h2 class="text-2xl text-peer-paper">{profile?.full_name ?? '프로필 미완성'}</h2>
          <p class="text-sm text-peer-paper/70">{profile?.role ?? '직군 정보를 추가해주세요'}</p>
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
        <a
          class="rounded-[20px] border border-white/10 bg-white/10 p-4 text-peer-paper no-underline transition hover:bg-white/15"
          href="/mypage/profile"
        >
          <p class="meta-line text-peer-paper/60">프로필 보기</p>
          <p class="mt-2 text-lg font-semibold">내 프로필과 추천서</p>
          <p class="mt-2 text-sm leading-6 text-peer-paper/70">
            공유 가능한 프로필과 추천서를 한 화면에서 확인하세요.
          </p>
        </a>
        <a
          class="rounded-[20px] border border-white/10 bg-white/10 p-4 text-peer-paper no-underline transition hover:bg-white/15"
          href={invitesEnabled ? '/invite' : '/mypage/settings'}
        >
          <p class="meta-line text-peer-paper/60">다음으로 보기</p>
          <p class="mt-2 text-lg font-semibold">
            {#if invitesEnabled}
              초대 현황 확인
            {:else}
              설정 살펴보기
            {/if}
          </p>
          <p class="mt-2 text-sm leading-6 text-peer-paper/70">
            {#if invitesEnabled}
              초대권 상태와 연결 현황을 바로 확인할 수 있습니다.
            {:else}
              알림과 계정 관리 상태를 한 번에 점검할 수 있습니다.
            {/if}
          </p>
        </a>
      </div>
    </div>
  </section>

  <section class="grid gap-5 lg:grid-cols-3">
    <a
      class="section-shell flex h-full flex-col gap-4 no-underline transition hover:border-peer-stoneDark hover:bg-peer-paperAlt"
      href="/mypage/profile"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="space-y-1">
          <p class="section-kicker">프로필 보기</p>
          <h2 class="headline-balance text-2xl">프로필과 추천서 확인</h2>
        </div>
        <div class="rounded-[18px] bg-peer-paperAlt p-3 text-peer-forest">
          <UserRound class="h-5 w-5" />
        </div>
      </div>
      <p class="section-copy">
        내가 작성한 프로필과 동료들이 남긴 추천서를 한 화면에서 확인하고, 필요한 내용을 바로 수정할
        수 있습니다.
      </p>
      <p class="mt-auto text-sm font-semibold text-peer-forest">
        {#if profile?.updated_at}
          최근 업데이트: {new Date(profile.updated_at).toLocaleDateString('ko-KR')}
        {:else}
          프로필을 작성해 신뢰 신호를 만들어보세요
        {/if}
      </p>
    </a>

    {#if invitesEnabled}
      <a
        class="section-shell flex h-full flex-col gap-4 no-underline transition hover:border-peer-stoneDark hover:bg-peer-paperAlt"
        href="/invite"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="space-y-1">
            <p class="section-kicker">초대</p>
            <h2 class="headline-balance text-2xl">신뢰하는 동료 초대하기</h2>
          </div>
          <div class="rounded-[18px] bg-peer-paperAlt p-3 text-peer-amber">
            <Sparkles class="h-5 w-5" />
          </div>
        </div>
        <p class="section-copy">
          초대 링크를 발급하고, 내가 만든 연결이 실제로 어떻게 이어지는지 확인할 수 있습니다.
        </p>
        <p class="mt-auto text-sm font-semibold text-peer-forest">초대 현황 보러 가기</p>
      </a>
    {:else}
      <div class="section-shell flex h-full flex-col gap-4 border-dashed text-peer-copySoft">
        <div class="space-y-1">
          <p class="section-kicker">초대</p>
          <h2 class="headline-balance text-2xl text-peer-copy">초대 기능 준비 중</h2>
        </div>
        <p class="section-copy">
          베타 초대 기능을 점검 중입니다. 다시 열리면 동료를 초대할 수 있도록 안내드릴게요.
        </p>
      </div>
    {/if}

    <a
      class="section-shell flex h-full flex-col gap-4 no-underline transition hover:border-peer-stoneDark hover:bg-peer-paperAlt"
      href="/mypage/settings"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="space-y-1">
          <p class="section-kicker">설정</p>
          <h2 class="headline-balance text-2xl">알림과 계정 관리</h2>
        </div>
        <div class="rounded-[18px] bg-peer-paperAlt p-3 text-peer-forest">
          <Settings2 class="h-5 w-5" />
        </div>
      </div>
      <p class="section-copy">
        이메일 알림, 계정 상태, 탈퇴 관련 작업을 하나의 화면에서 안전하게 관리할 수 있습니다.
      </p>
      <p class="mt-auto text-sm font-semibold text-peer-forest">설정 보러 가기</p>
    </a>
  </section>
</main>
