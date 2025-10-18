<script lang="ts">
	import type { ActionData, PageData } from './$types';

	const { data, form } = $props<{ data: PageData; form: ActionData }>();

	const { session, post, comments, loadError } = data;
	const isAuthor = $derived(session?.user.id === post.author_id);

	let editingPost = $state(false);
	let postDraft = $state({
		title: post.title,
		content: post.content
	});

	let commentDraft = $state('');
	let editingCommentId = $state<string | null>(null);
	let editingCommentContent = $state('');

	$effect(() => {
		if (!editingPost) {
			postDraft = {
				title: post.title,
				content: post.content
			};
		}
	});

	$effect(() => {
		if (form?.intent === 'updatePost') {
			if (form.success) {
				editingPost = false;
			} else if (form.values) {
				postDraft = {
					title: form.values.title ?? postDraft.title,
					content: form.values.content ?? postDraft.content
				};
			}
		} else if (form?.intent === 'commentCreate') {
			if (form.success) {
				commentDraft = '';
			} else if (form.values?.content) {
				commentDraft = form.values.content;
			}
		} else if (form?.intent === 'commentUpdate') {
			if (form.success) {
				if (form.commentId === editingCommentId) {
					editingCommentId = null;
					editingCommentContent = '';
				}
			} else if (form.commentId) {
				editingCommentId = form.commentId;
				if (form.values?.content) {
					editingCommentContent = form.values.content;
				}
			}
		} else if (form?.intent === 'deletePost' && !form.success && form.serverMessage) {
			// retain editing state but surface error via server message
		}
	});

	const formatDateTime = (value: string) =>
		new Date(value).toLocaleString('ko-KR', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
</script>

<svelte:head>
	<title>{post.title} · 모임 라운지</title>
</svelte:head>

<main class="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 pb-16 pt-14 sm:px-8">
	<a class="inline-flex w-fit items-center gap-1 text-sm font-semibold text-blue-600 transition hover:text-blue-700 hover:underline" href="/gatherings">
		← 모임 목록으로
	</a>

	<article class="glass-panel space-y-6">
		<header class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
			<div class="flex items-center gap-4">
				<img
					class="h-14 w-14 rounded-full border-2 border-slate-200/60 bg-slate-50 object-cover"
					src={post.author?.photo_url ?? '/images/default-profile.svg'}
					alt={(post.author?.full_name ?? '알 수 없는 멤버') + '의 프로필 이미지'}
				/>
				<div>
					<p class="text-base font-semibold text-peer-navy">{post.author?.full_name ?? '알 수 없는 멤버'}</p>
					<p class="text-sm text-slate-500">{post.author?.role ?? '역할 미입력'}</p>
				</div>
			</div>
			<div class="flex flex-col items-start gap-3 text-sm text-slate-500 md:items-end">
				<div class="flex flex-col items-start gap-1 md:items-end">
					<p>작성: {formatDateTime(post.created_at)}</p>
					{#if post.updated_at && post.updated_at !== post.created_at}
						<p>수정: {formatDateTime(post.updated_at)}</p>
					{/if}
				</div>
				{#if isAuthor}
					<div class="flex items-center gap-2">
						<button
							class="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300/60 bg-slate-50 text-lg text-slate-500 transition hover:-translate-y-0.5 hover:border-peer-indigo/60 hover:text-peer-indigo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peer-indigo/40"
							type="button"
							aria-label={editingPost ? '게시글 수정 취소' : '게시글 수정'}
							onclick={() => (editingPost = !editingPost)}
						>
							{editingPost ? '↺' : '✎'}
						</button>
						<form
							method="post"
							action="?/deletePost"
							onsubmit={(event) => {
								if (!confirm('게시글을 삭제하시겠어요?')) {
									event.preventDefault();
								}
							}}
						>
							<button
								type="submit"
								class="flex h-9 w-9 items-center justify-center rounded-full border border-rose-200/70 bg-rose-50 text-base text-rose-500 transition hover:-translate-y-0.5 hover:border-rose-400/70 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40"
								aria-label="게시글 삭제"
							>
								🗑
							</button>
						</form>
					</div>
				{/if}
			</div>
		</header>

		{#if editingPost}
			<form class="space-y-4" method="post" action="?/updatePost">
				<label class="flex flex-col gap-2 text-sm font-semibold text-slate-700">
					<span>제목</span>
					<input
						name="title"
						type="text"
						required
						bind:value={postDraft.title}
						class="w-full rounded-2xl border border-slate-300/60 bg-slate-50/90 px-4 py-3 text-sm text-peer-navy shadow-sm transition focus:border-peer-indigo focus:bg-white focus:outline-none focus:ring-2 focus:ring-peer-indigo/30"
					/>
					{#if form?.intent === 'updatePost' && form.errors?.title}
						<p class="text-sm font-medium text-rose-500">{form.errors.title}</p>
					{/if}
				</label>
				<label class="flex flex-col gap-2 text-sm font-semibold text-slate-700">
					<span>내용</span>
					<textarea
						name="content"
						rows={8}
						required
						bind:value={postDraft.content}
						class="w-full rounded-2xl border border-slate-300/60 bg-slate-50/90 px-4 py-3 text-sm text-peer-navy shadow-sm transition focus:border-peer-indigo focus:bg-white focus:outline-none focus:ring-2 focus:ring-peer-indigo/30"
					></textarea>
					{#if form?.intent === 'updatePost' && form.errors?.content}
						<p class="text-sm font-medium text-rose-500">{form.errors.content}</p>
					{/if}
				</label>
				{#if form?.intent === 'updatePost' && form.serverMessage}
					<p class="text-sm font-semibold text-rose-500">{form.serverMessage}</p>
				{/if}
				<button type="submit" class="btn btn-primary">게시글 저장</button>
			</form>
		{:else}
			<h1 class="text-3xl font-semibold text-peer-navy">{post.title}</h1>
			<div class="space-y-4 text-base leading-relaxed text-slate-700">
				{#each post.content.split('\n') as line, index (index)}
					<p>{line}</p>
				{/each}
			</div>
		{/if}
	</article>

	<section class="glass-panel space-y-6">
		<header class="space-y-1">
			<h2 class="text-2xl font-semibold text-peer-navy">댓글</h2>
			<p class="text-sm text-slate-600">참여 의사나 궁금한 점을 댓글로 남겨보세요.</p>
		</header>

		{#if loadError}
			<p class="text-sm font-semibold text-rose-500" role="alert">{loadError}</p>
		{/if}

		<form class="space-y-3" method="post" action="?/commentCreate">
			<label class="block">
				<textarea
					name="content"
					rows={4}
					required
					placeholder="모임에 어떻게 참여하고 싶은지, 간단한 자기소개 등을 자유롭게 남겨주세요."
					bind:value={commentDraft}
					class="w-full rounded-2xl border border-slate-300/60 bg-slate-50/90 px-4 py-3 text-sm text-peer-navy shadow-sm transition focus:border-peer-indigo focus:bg-white focus:outline-none focus:ring-2 focus:ring-peer-indigo/30"
				></textarea>
			</label>
			{#if form?.intent === 'commentCreate' && form.errors?.content}
				<p class="text-sm font-medium text-rose-500">{form.errors.content}</p>
			{/if}
			{#if form?.intent === 'commentCreate' && form.serverMessage}
				<p class="text-sm font-semibold text-rose-500">{form.serverMessage}</p>
			{/if}
			<button type="submit" class="btn btn-primary">댓글 남기기</button>
		</form>

		{#if comments.length === 0}
			<p class="rounded-2xl border border-dashed border-slate-300/70 bg-slate-100/70 px-4 py-6 text-center text-slate-500">
				아직 댓글이 없습니다. 첫 댓글을 남겨보세요!
			</p>
		{:else}
			<ul class="space-y-4">
				{#each comments as comment}
					<li class="rounded-3xl border border-slate-200/60 bg-white/85 p-5 shadow-sm backdrop-blur">
						<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
							<div class="flex items-start gap-3">
								<img
									class="h-10 w-10 rounded-full border border-slate-200/60 bg-slate-50 object-cover"
									src={comment.author?.photo_url ?? '/images/default-profile.svg'}
									alt={(comment.author?.full_name ?? '알 수 없는 멤버') + '의 프로필 이미지'}
								/>
								<div>
									<p class="text-sm font-semibold text-peer-navy">{comment.author?.full_name ?? '알 수 없는 멤버'}</p>
									<p class="text-xs text-slate-500">{formatDateTime(comment.created_at)}</p>
								</div>
							</div>
							{#if comment.author_id === session?.user.id}
								<div class="flex items-center gap-2">
									<button
										type="button"
										onclick={() => {
											editingCommentId = comment.id;
											editingCommentContent = comment.content;
										}}
										class="inline-flex items-center justify-center rounded-full border border-slate-300/60 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:border-peer-indigo/60 hover:text-peer-indigo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peer-indigo/40"
									>
										수정
									</button>
									<form method="post" action="?/commentDelete">
										<input type="hidden" name="commentId" value={comment.id} />
										<button
											type="submit"
											class="inline-flex items-center justify-center rounded-full border border-rose-200/60 px-3 py-1.5 text-xs font-semibold text-rose-500 transition hover:-translate-y-0.5 hover:border-rose-400/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40"
										>
											삭제
										</button>
									</form>
								</div>
							{/if}
						</div>

						{#if editingCommentId === comment.id}
							<form class="mt-3 space-y-3" method="post" action="?/commentUpdate">
								<input type="hidden" name="commentId" value={comment.id} />
								<textarea
									name="content"
									rows={4}
									required
									bind:value={editingCommentContent}
									class="w-full rounded-2xl border border-slate-300/60 bg-slate-50/90 px-4 py-3 text-sm text-peer-navy shadow-sm transition focus:border-peer-indigo focus:bg-white focus:outline-none focus:ring-2 focus:ring-peer-indigo/30"
								></textarea>
								{#if form?.intent === 'commentUpdate' && form.commentId === comment.id && form.errors?.content}
									<p class="text-sm font-medium text-rose-500">{form.errors.content}</p>
								{/if}
								{#if form?.intent === 'commentUpdate' && form.commentId === comment.id && form.serverMessage}
									<p class="text-sm font-semibold text-rose-500">{form.serverMessage}</p>
								{/if}
								<div class="flex items-center gap-2">
									<button
										type="button"
										onclick={() => {
											editingCommentId = null;
											editingCommentContent = '';
										}}
										class="inline-flex items-center justify-center rounded-full border border-slate-300/60 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/60"
									>
										취소
									</button>
									<button type="submit" class="btn btn-primary px-5 py-2 text-xs">저장</button>
								</div>
							</form>
						{:else}
							<p class="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{comment.content}</p>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</main>
