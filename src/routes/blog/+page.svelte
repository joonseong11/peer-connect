<script lang="ts">
	import { Rss } from 'lucide-svelte';
	import MetaTags from '$lib/components/MetaTags.svelte';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();

	const posts = $derived(data.posts);
	const nextCursor = $derived(data.nextCursor);
	const defaultAvatar = '/images/default-profile.svg';

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('ko-KR', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<MetaTags
	title="동료 블로그 · Peer Connect"
	description="동료들의 최근 블로그 글을 모아보세요."
	path="/blog"
	type="website"
/>

<main class="page-shell">
	<section class="section-shell space-y-6">
		<div class="space-y-1">
			<p class="section-kicker">블로그</p>
			<h1 class="headline-balance text-3xl sm:text-4xl">동료의 최근 글</h1>
			<p class="text-base text-peer-copySoft">동료들이 작성한 블로그 글을 모아서 보여드려요.</p>
		</div>

		{#if posts.length === 0}
			<div class="empty-panel text-center">
				<Rss class="mx-auto mb-3 h-8 w-8 text-peer-copyMuted" />
				<p>아직 수집된 블로그 글이 없어요.</p>
				<p class="mt-1 text-sm text-peer-copyMuted">
					멤버들이 프로필에 블로그를 등록하면 여기에 글이 모입니다.
				</p>
			</div>
		{:else}
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each posts as post}
					{@const author = Array.isArray(post.author) ? post.author[0] : post.author}
					<article class="surface-panel flex flex-col gap-3">
						{#if post.thumbnail_url}
							<a href={post.url} target="_blank" rel="noopener noreferrer">
								<img
									class="aspect-[16/9] w-full rounded-[16px] border border-peer-stone object-cover"
									src={post.thumbnail_url}
									alt={post.title}
									loading="lazy"
								/>
							</a>
						{/if}
						<div class="flex flex-1 flex-col gap-2">
							<a
								class="text-base font-semibold leading-snug text-peer-ink no-underline hover:underline"
								href={post.url}
								target="_blank"
								rel="noopener noreferrer"
							>
								{post.title}
							</a>
							{#if post.summary}
								<p class="line-clamp-2 text-sm text-peer-copySoft">{post.summary}</p>
							{/if}
						</div>
						<footer class="flex items-center justify-between pt-1">
							{#if author}
								<a
									class="flex items-center gap-2 no-underline"
									href={`/members/${author.user_id}`}
								>
									<img
										class="h-6 w-6 rounded-full border border-peer-stone object-cover"
										src={author.photo_url ?? defaultAvatar}
										alt={author.full_name}
									/>
									<span class="text-xs font-medium text-peer-copy">{author.full_name}</span>
								</a>
							{/if}
							<time class="text-xs text-peer-copyMuted" datetime={post.published_at}>
								{formatDate(post.published_at)}
							</time>
						</footer>
					</article>
				{/each}
			</div>

			{#if nextCursor}
				<div class="flex justify-center pt-4">
					<a class="btn btn-secondary" href={`/blog?cursor=${encodeURIComponent(nextCursor)}`}>
						더 보기
					</a>
				</div>
			{/if}
		{/if}
	</section>
</main>
