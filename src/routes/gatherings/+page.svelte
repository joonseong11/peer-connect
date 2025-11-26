<script lang="ts">
        import MetaTags from '$lib/components/MetaTags.svelte';
        import type { ActionData, PageData } from './$types';

        const { data, form } = $props<{ data: PageData; form: ActionData }>();

        const { session, posts, loadError } = data;
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

	const formatDate = (value: string) =>
		new Date(value).toLocaleDateString('ko-KR', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	const formatTime = (value: string) =>
		new Date(value).toLocaleTimeString('ko-KR', {
			hour: '2-digit',
			minute: '2-digit'
		});
</script>

<MetaTags
        title="모임 라운지 · Peer Connect"
        description="Peer Connect 멤버들과 함께하는 다양한 모임을 만들고 참여해보세요."
        path="/gatherings"
        type="website"
/>

<main class="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 pb-16 pt-14 sm:px-8">
	<section class="glass-panel space-y-4">
		<a class="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 transition hover:text-blue-700 " href="/">
			← 홈으로
		</a>
		<h1 class="text-3xl font-semibold text-peer-navy">모임 라운지</h1>
		<p class="text-slate-600">
			Peer Connect 멤버와 함께 커피챗, 모각코, 라이트닝 토크, 사이드프로젝트 등 다양한 모임을 만들고 합류해보세요.
			작성하신 글은 모든 멤버에게 이메일로 공유됩니다.
		</p>
		{#if loadError}
			<p class="text-sm font-semibold text-rose-500" role="alert">{loadError}</p>
		{/if}
	</section>

	<section class="glass-panel space-y-6">
		<h2 class="text-2xl font-semibold text-peer-navy">모임 공유하기</h2>
                <form class="space-y-5" method="post" action="?/create" onsubmit={handleCreateSubmit}>
			<label class="flex flex-col gap-2 text-sm font-semibold text-slate-700">
				<span>제목</span>
				<input
					name="title"
					type="text"
					placeholder="예: 토요일 오후 모각코 하실 분"
					required
					value={values.title}
					class="w-full rounded-2xl border border-slate-300/60 bg-slate-50/90 px-4 py-3 text-sm text-peer-navy shadow-sm transition focus:border-peer-indigo focus:bg-white focus:outline-none focus:ring-2 focus:ring-peer-indigo/30"
				/>
				{#if fieldError('title')}
					<p class="text-sm font-medium text-rose-500" role="alert">{fieldError('title')}</p>
				{/if}
			</label>
			<label class="flex flex-col gap-2 text-sm font-semibold text-slate-700">
				<span>모임 소개</span>
				<textarea
					name="content"
					rows={6}
					required
					placeholder="모임 목적, 진행 방식, 필요한 준비물, 참가 신청 방법 등을 자세히 작성해주세요."
					class="w-full rounded-2xl border border-slate-300/60 bg-slate-50/90 px-4 py-3 text-sm text-peer-navy shadow-sm transition focus:border-peer-indigo focus:bg-white focus:outline-none focus:ring-2 focus:ring-peer-indigo/30"
				>{values.content}</textarea>
				{#if fieldError('content')}
					<p class="text-sm font-medium text-rose-500" role="alert">{fieldError('content')}</p>
				{/if}
			</label>
			{#if serverMessage}
				<p class="text-sm font-semibold text-rose-500" role="alert">{serverMessage}</p>
			{/if}
                        <button type="submit" class="btn btn-primary" disabled={createSubmitting}>
                                {#if createSubmitting}
                                        <svg
                                                class="h-4 w-4 animate-spin"
                                                viewBox="0 0 24 24"
                                                aria-hidden="true"
                                        >
                                                <circle
                                                        class="opacity-25"
                                                        cx="12"
                                                        cy="12"
                                                        r="10"
                                                        stroke="currentColor"
                                                        stroke-width="4"
                                                        fill="none"
                                                />
                                                <path
                                                        class="opacity-75"
                                                        fill="currentColor"
                                                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                                />
                                        </svg>
                                        <span>등록 중…</span>
                                {:else}
                                        등록하기
                                {/if}
                        </button>
                </form>
	</section>

	<section class="glass-panel space-y-6">
		<header class="space-y-2">
			<h2 class="text-2xl font-semibold text-peer-navy">진행 중인 모임</h2>
			<p class="text-slate-600">모임 카드를 선택하면 상세 내용을 확인하고 댓글로 참여 의사를 남길 수 있어요.</p>
		</header>
		{#if posts.length === 0}
			<p class="rounded-2xl border border-dashed border-slate-300/70 bg-slate-100/70 px-4 py-6 text-center text-slate-500">
				아직 등록된 모임이 없습니다. 첫 번째 모임을 공유해보세요!
			</p>
		{:else}
			<ul class="grid gap-4">
				{#each posts as post}
					<li>
						<a
							class="flex flex-col gap-4 rounded-3xl border border-slate-200/60 bg-white/85 p-6 shadow-glass transition duration-200 hover:-translate-y-1 hover:border-peer-indigo/40 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peer-indigo/50"
							href={`/gatherings/${post.id}`}
						>
							<div class="flex items-center gap-3">
								<img
									class="h-12 w-12 rounded-full border border-slate-200/60 bg-slate-50 object-cover"
									src={post.author?.photo_url ?? '/images/default-profile.svg'}
									alt={(post.author?.full_name ?? '알 수 없는 멤버') + '의 프로필 이미지'}
								/>
								<div>
									<p class="text-sm font-semibold text-peer-navy">{post.author?.full_name ?? '알 수 없는 멤버'}</p>
									<p class="text-xs text-slate-500">
										{formatDate(post.created_at)} · {formatTime(post.created_at)}
									</p>
								</div>
							</div>
							<div class="space-y-2">
								<h3 class="text-lg font-semibold text-peer-navy">{post.title}</h3>
								<p class="text-sm leading-relaxed text-slate-600">
									{post.content.length > 200 ? `${post.content.slice(0, 200)}…` : post.content}
								</p>
							</div>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</main>
