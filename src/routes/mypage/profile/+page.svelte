<script lang="ts">
        import { PencilLine, UserRoundCog } from 'lucide-svelte';
        import type { PageData } from './$types';

        const { data } = $props<{ data: PageData }>();

        const profile = $derived(data.profile);
        const endorsements = $derived(data.endorsements);
        const loadError = $derived(data.loadError);
        const defaultAvatar = '/images/default-profile.svg';

        type ContactItem = {
                label: string;
                value: string;
                href: string;
                external: boolean;
        };

        const contactItems = $derived.by<ContactItem[]>(() => {
                if (!profile) {
                        return [];
                }

                const stripProtocol = (url: string) => url.replace(/^https?:\/\//, '');
                const items: ContactItem[] = [];

                if (profile.contact_linkedin) {
                        items.push({
                                label: 'LinkedIn',
                                value: stripProtocol(profile.contact_linkedin),
                                href: profile.contact_linkedin,
                                external: true
                        });
                }

                if (profile.contact_github) {
                        items.push({
                                label: 'GitHub',
                                value: stripProtocol(profile.contact_github),
                                href: profile.contact_github,
                                external: true
                        });
                }

                if (profile.contact_email) {
                        items.push({
                                label: '이메일',
                                value: profile.contact_email,
                                href: `mailto:${profile.contact_email}`,
                                external: false
                        });
                }

                return items;
        });
</script>

<svelte:head>
        <title>내 프로필 보기 · Peer Connect</title>
        <meta name="description" content="나의 프로필과 동료 추천서를 모아보세요." />
</svelte:head>

{#if !profile}
        <main class="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 px-5 pb-16 pt-14 text-center sm:px-8">
                <section class="glass-panel space-y-4">
                        <h1 class="text-3xl font-semibold text-peer-navy">아직 프로필이 없어요</h1>
                        <p class="text-slate-600">프로필을 작성하면 동료들이 남긴 추천서를 한눈에 볼 수 있습니다.</p>
                        <div class="flex flex-wrap justify-center gap-3">
                                <a class="btn btn-primary" href="/profile">
                                        <UserRoundCog class="h-4 w-4" />
                                        <span>프로필 설정하러 가기</span>
                                </a>
                                <a class="btn btn-secondary" href="/mypage">마이페이지로 돌아가기</a>
                        </div>
                </section>
        </main>
{:else}
        <main class="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 pb-16 pt-14 sm:px-8">
                <section class="glass-panel space-y-4">
                        <div class="flex flex-wrap items-start justify-between gap-4">
                                <div class="space-y-2">
                                        <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">내 프로필</p>
                                        <div class="flex items-center gap-3">
                                                <img
                                                        class="h-16 w-16 rounded-3xl border border-slate-200/70 bg-slate-50 object-cover"
                                                        src={profile.photo_url ?? defaultAvatar}
                                                        alt="내 프로필 이미지"
                                                />
                                                <div>
                                                        <h1 class="text-3xl font-semibold text-peer-navy">{profile.full_name}</h1>
                                                        <p class="text-sm text-slate-500">{profile.role || '직군 정보를 추가해주세요'}</p>
                                                </div>
                                        </div>
                                        {#if loadError}
                                                <p class="text-sm font-semibold text-rose-500" role="alert">{loadError}</p>
                                        {/if}
                                        {#if profile.updated_at}
                                                <p class="text-xs text-slate-500">최근 업데이트: {new Date(profile.updated_at).toLocaleDateString('ko-KR')}</p>
                                        {/if}
                                </div>
                                <div class="flex flex-wrap items-center gap-3">
                                        <a class="btn btn-secondary" href="/mypage">마이페이지</a>
                                        <a class="btn btn-primary" href="/profile">
                                                <PencilLine class="h-4 w-4" />
                                                <span>프로필 수정하기</span>
                                        </a>
                                </div>
                        </div>

                        <p class="text-sm text-slate-600">
                                프로필을 최신 상태로 유지하고 동료들이 남긴 추천서를 모아보세요. 프로필 설정 페이지에서 바로 정보를 수정할 수 있습니다.
                        </p>
                </section>

                <section class="glass-panel space-y-6">
                        <div class="grid gap-6 lg:grid-cols-[220px_1fr]">
                                <div class="flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
                                        <img
                                                class="h-40 w-40 rounded-3xl border-4 border-slate-200/70 bg-slate-50 object-cover"
                                                src={profile.photo_url ?? defaultAvatar}
                                                alt={`${profile.full_name} 프로필 이미지`}
                                        />
                                        <p class="text-sm font-semibold text-slate-500">{profile.role || '직군 정보 미입력'}</p>
                                        <a class="btn btn-secondary" href="/profile">
                                                <UserRoundCog class="h-4 w-4" />
                                                <span>프로필 설정 이동</span>
                                        </a>
                                </div>
                                <div class="space-y-6">
                                        <section class="space-y-2">
                                                <h2 class="text-xl font-semibold text-peer-navy">소개</h2>
                                                <p class="text-sm leading-relaxed text-slate-600">{profile.introduction || '아직 소개가 작성되지 않았습니다.'}</p>
                                        </section>
                                        {#if contactItems.length > 0}
                                                <section class="space-y-3">
                                                        <h2 class="text-xl font-semibold text-peer-navy">연락처</h2>
                                                        <ul class="space-y-2">
                                                                {#each contactItems as item}
                                                                        <li>
                                                                                <a
                                                                                        class="flex flex-col gap-1 rounded-2xl border border-slate-200/60 bg-white/85 px-4 py-3 text-sm text-peer-navy shadow-sm transition hover:-translate-y-0.5 hover:border-peer-indigo/60 hover:text-peer-indigo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peer-indigo/30"
                                                                                        href={item.href}
                                                                                        target={item.external ? '_blank' : undefined}
                                                                                        rel={item.external ? 'noopener noreferrer' : undefined}
                                                                                >
                                                                                        <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">{item.label}</span>
                                                                                        <span class="break-all">{item.value}</span>
                                                                                </a>
                                                                        </li>
                                                                {/each}
                                                        </ul>
                                                </section>
                                        {/if}
                                        <section class="space-y-3">
                                                <h2 class="text-xl font-semibold text-peer-navy">커리어 및 교육</h2>
                                                {#if profile.career_history}
                                                        <ul class="space-y-2">
                                                                {#each profile.career_history.split('\n').filter(Boolean) as line}
                                                                        <li class="relative pl-5 text-sm text-slate-600 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:transform before:h-2 before:w-2 before:rounded-full before:bg-gradient-to-br before:from-peer-sky before:to-peer-indigo before:content-['']">
                                                                                {line}
                                                                        </li>
                                                                {/each}
                                                        </ul>
                                                {:else}
                                                        <p class="text-sm text-slate-500">커리어 및 교육 요약이 비어 있어요.</p>
                                                {/if}
                                        </section>
                                </div>
                        </div>
                </section>

                <section class="glass-panel space-y-6">
                        <header class="space-y-2">
                                <h2 class="text-2xl font-semibold text-peer-navy">동료 추천서</h2>
                                <p class="text-sm text-slate-600">동료들이 남긴 칭찬과 피드백을 모아봤어요.</p>
                        </header>

                        {#if endorsements.length === 0}
                                <p class="rounded-3xl border border-dashed border-slate-300/70 bg-slate-50/70 px-4 py-6 text-center text-slate-500">
                                        아직 작성된 추천서가 없습니다. 협업한 동료에게 추천을 요청해보세요!
                                </p>
                        {:else}
                                {#each endorsements as endorsement}
                                        <article class="rounded-3xl border border-slate-200/60 bg-white/85 p-6 shadow-sm backdrop-blur">
                                                <header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                        {#if endorsement.author}
                                                                <a class="flex items-center gap-3" href={`/members/${endorsement.author.user_id ?? endorsement.author_id}`}>
                                                                        <img
                                                                                class="h-12 w-12 rounded-full border border-slate-200/60 bg-slate-50 object-cover"
                                                                                src={endorsement.author.photo_url ?? defaultAvatar}
                                                                                alt={`${endorsement.author.full_name}의 프로필 이미지`}
                                                                        />
                                                                        <div>
                                                                                <span class="block text-sm font-semibold text-peer-navy">{endorsement.author.full_name}</span>
                                                                                <span class="block text-xs text-slate-500">{endorsement.author.role ?? '역할 미입력'}</span>
                                                                        </div>
                                                                </a>
                                                        {:else}
                                                                <div class="flex items-center gap-3">
                                                                        <img
                                                                                class="h-12 w-12 rounded-full border border-slate-200/60 bg-slate-50 object-cover"
                                                                                src={defaultAvatar}
                                                                                alt="알 수 없는 동료의 프로필 이미지"
                                                                        />
                                                                        <div>
                                                                                <span class="block text-sm font-semibold text-slate-500">알 수 없는 동료</span>
                                                                                <span class="block text-xs text-slate-400">역할 미입력</span>
                                                                        </div>
                                                                </div>
                                                        {/if}
                                                        <time class="text-xs text-slate-400" datetime={endorsement.created_at}>
                                                                {new Date(endorsement.created_at).toLocaleDateString('ko-KR', {
                                                                        year: 'numeric',
                                                                        month: 'short',
                                                                        day: 'numeric'
                                                                })}
                                                        </time>
                                                </header>
                                                <p class="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">{endorsement.content}</p>
                                        </article>
                                {/each}
                        {/if}
                </section>
        </main>
{/if}
