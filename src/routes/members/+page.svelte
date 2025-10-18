<script lang="ts">
	import type { PageData } from './$types';

	const { data } = $props<{ data: PageData }>();

	const { profiles, loadError } = data;
	const defaultAvatar = '/images/default-profile.svg';

	const endorsementSnippet = (content: string, maxLength = 80) =>
		content.length > maxLength ? `${content.slice(0, maxLength)}…` : content;
</script>

<svelte:head>
	<title>동료 프로필 둘러보기 · Peer Connect</title>
	<meta name="description" content="Peer Connect 멤버들의 프로필을 살펴보고 영감을 얻어보세요." />
</svelte:head>

<main class="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 pb-16 pt-14 sm:px-8">
	<section class="glass-panel space-y-4">
		<a class="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 transition hover:text-blue-700 hover:underline" href="/">
			← 홈으로
		</a>
		<h1 class="text-3xl font-semibold text-peer-navy">동료 프로필 둘러보기</h1>
		<p class="text-slate-600">
			Peer Connect에 참여한 멤버들의 커리어와 관심사를 둘러보세요. 함께했던 동료에게 칭찬 또는 추천서를 남겨보세요.
		</p>
		{#if loadError}
			<p class="text-sm font-semibold text-rose-500" role="alert">{loadError}</p>
		{:else}
			<p class="text-sm font-semibold text-blue-600">프로필 카드를 선택하면 자세한 경력과 추천서를 확인할 수 있어요.</p>
		{/if}
	</section>

	<section class="grid gap-6 md:grid-cols-2">
		{#if profiles.length === 0}
			<p class="glass-panel rounded-3xl text-center text-slate-500">아직 등록된 프로필이 없습니다. 먼저 자신의 프로필을 작성해보세요!</p>
		{:else}
			{#each profiles as profile}
				<a
					class="flex flex-col gap-5 rounded-3xl border border-slate-200/60 bg-white/90 p-8 shadow-glass transition duration-200 hover:-translate-y-1 hover:border-peer-indigo/50 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peer-indigo/60 hover:no-underline"
					href={`/members/${profile.user_id}`}
				>
					<div class="flex items-center gap-4">
						<img
							class="h-16 w-16 rounded-full border-2 border-slate-200/60 bg-slate-50 object-cover"
							src={profile.photo_url ?? defaultAvatar}
							alt={`${profile.full_name} 프로필 이미지`}
						/>
						<div>
							<h2 class="text-xl font-semibold text-peer-navy">{profile.full_name}</h2>
							<p class="text-sm text-slate-500">{profile.role}</p>
						</div>
					</div>
					<p class="text-sm leading-relaxed text-slate-600">
						{profile.introduction
							? profile.introduction.length > 160
								? `${profile.introduction.slice(0, 160)}…`
								: profile.introduction
							: '아직 소개가 작성되지 않았습니다.'}
					</p>
					{#if profile.endorsement_count > 0 && profile.first_endorsement}
						<p class="text-sm font-semibold text-peer-indigo">
							“{endorsementSnippet(profile.first_endorsement)}”
							{#if profile.endorsement_count > 1}
								추천 {profile.endorsement_count}개
							{:else}
								추천 1개
							{/if}
						</p>
					{/if}
					<div class="flex items-center justify-between pt-2 text-xs font-semibold">
						<span class="text-slate-400">동료와 연결되세요</span>
						<span class="text-peer-indigo">프로필 보기</span>
					</div>
				</a>
			{/each}
		{/if}
	</section>
</main>
