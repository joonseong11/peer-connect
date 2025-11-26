<script lang="ts">
        import { UserRound, Sparkles, Settings2 } from 'lucide-svelte';
        import MetaTags from '$lib/components/MetaTags.svelte';
        import type { PageData } from './$types';

        const { data } = $props<{ data: PageData }>();

        const profile = $derived(data.profile);
        const invitesEnabled = $derived(data.invitesEnabled);
        const profileLoadError = $derived(data.profileLoadError ?? null);
        const defaultAvatar = '/images/default-profile.svg';
</script>

<MetaTags
        title="마이페이지 · Peer Connect"
        description="프로필, 초대, 설정을 모아볼 수 있는 마이페이지 허브입니다."
        path="/mypage"
        type="website"
/>

<main class="mx-auto flex w-full max-w-5xl flex-col gap-10 px-5 pb-16 pt-14 sm:px-8">
        <header class="glass-panel space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-4">
                        <div class="space-y-2">
                                <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">마이페이지</p>
                                <h1 class="text-3xl font-semibold text-peer-navy">나의 활동 한눈에 보기</h1>
                                <p class="text-sm text-slate-600">
                                        프로필, 초대, 설정을 한 곳에서 관리하세요. 동료들이 남긴 추천서도 함께 확인할 수 있습니다.
                                </p>
                                {#if profileLoadError}
                                        <p class="text-sm font-semibold text-rose-500" role="alert">{profileLoadError}</p>
                                {/if}
                        </div>
                        <div class="flex items-center gap-3 rounded-3xl border border-slate-200/70 bg-white/90 px-4 py-3 shadow-sm">
                                <img
                                        class="h-12 w-12 rounded-2xl border border-slate-200/70 bg-slate-50 object-cover"
                                        src={profile?.photo_url ?? defaultAvatar}
                                        alt="내 프로필 썸네일"
                                />
                                <div class="space-y-1 text-right">
                                        <p class="text-sm font-semibold text-peer-navy">{profile?.full_name ?? '프로필 미완성'}</p>
                                        <p class="text-xs text-slate-500">{profile?.role ?? '직군 정보를 추가해주세요'}</p>
                                </div>
                        </div>
                </div>
        </header>

        <section class="grid gap-4 lg:grid-cols-3">
                <a
                        class="group relative flex h-full flex-col gap-3 rounded-3xl border border-peer-indigo/40 bg-gradient-to-br from-peer-indigo/10 via-white to-peer-sky/10 px-6 py-6 text-peer-navy shadow-sm transition hover:-translate-y-1 hover:border-peer-indigo/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peer-indigo/30"
                        href="/mypage/profile"
                >
                        <div class="flex items-start justify-between gap-3">
                                <div class="space-y-1">
                                        <span class="text-xs font-semibold uppercase tracking-wide text-peer-indigo">내 프로필 보기</span>
                                        <h2 class="text-xl font-semibold">프로필과 추천서 확인</h2>
                                </div>
                                <div class="rounded-2xl bg-white/70 p-2 text-peer-indigo shadow-sm">
                                        <UserRound class="h-5 w-5" />
                                </div>
                        </div>
                        <p class="text-sm text-slate-600">
                                내가 작성한 프로필과 동료들이 남긴 추천서를 한 화면에서 확인하고, 필요한 내용을 바로 수정하세요.
                        </p>
                        {#if profile?.updated_at}
                                <p class="text-xs text-peer-indigo">최근 업데이트: {new Date(profile.updated_at).toLocaleDateString('ko-KR')}</p>
                        {:else}
                                <p class="text-xs text-slate-500">프로필을 작성하고 추천서를 받아보세요.</p>
                        {/if}
                </a>

                {#if invitesEnabled}
                        <a
                                class="flex h-full flex-col gap-3 rounded-3xl border border-slate-200/70 bg-white/90 px-6 py-6 text-peer-navy shadow-sm transition hover:-translate-y-1 hover:border-peer-indigo/60 hover:text-peer-indigo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peer-indigo/30"
                                href="/invite"
                        >
                                <div class="flex items-start justify-between gap-3">
                                        <div class="space-y-1">
                                                <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">초대</span>
                                                <h2 class="text-xl font-semibold">신뢰하는 동료 초대하기</h2>
                                        </div>
                                        <div class="rounded-2xl bg-slate-100 p-2 text-peer-indigo">
                                                <Sparkles class="h-5 w-5" />
                                        </div>
                                </div>
                                <p class="text-sm text-slate-600">
                                        신뢰하는 동료들을 초대해보세요.
                                </p>
                        </a>
                {:else}
                        <div class="flex h-full flex-col justify-between gap-3 rounded-3xl border border-dashed border-slate-300/70 bg-slate-50/70 px-6 py-6 text-slate-500">
                                <div class="space-y-1">
                                        <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">초대</span>
                                        <h2 class="text-xl font-semibold text-slate-600">초대 기능 준비 중</h2>
                                </div>
                                <p class="text-sm">베타 초대 기능을 점검 중입니다. 곧 동료를 초대할 수 있도록 안내드릴게요.</p>
                        </div>
                {/if}

                <a
                        class="flex h-full flex-col gap-3 rounded-3xl border border-slate-200/70 bg-white/90 px-6 py-6 text-peer-navy shadow-sm transition hover:-translate-y-1 hover:border-peer-indigo/60 hover:text-peer-indigo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peer-indigo/30"
                        href="/mypage/settings"
                >
                        <div class="flex items-start justify-between gap-3">
                                <div class="space-y-1">
                                        <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">설정</span>
                                        <h2 class="text-xl font-semibold">알림 · 탈퇴 관리</h2>
                                </div>
                                <div class="rounded-2xl bg-slate-100 p-2 text-peer-indigo">
                                        <Settings2 class="h-5 w-5" />
                                </div>
                        </div>
                        <p class="text-sm text-slate-600">
                                이메일 알림과 계정 상태를 조정하고 싶다면 설정 페이지에서 변경할 수 있습니다.
                        </p>
                        <p class="text-xs text-slate-500">알림 설정과 회원 탈퇴를 한 곳에 모았어요.</p>
                </a>
        </section>
</main>
