<script lang="ts">
	import type { Session } from '@supabase/supabase-js';
	import { page } from '$app/stores';
	import { derived } from 'svelte/store';

	const { session } = $props<{ session: Session | null }>();

	const navItems = [
		{ href: '/members', label: '멤버' },
		{ href: '/gatherings', label: '모임 라운지' }
	];

	const loginActionStore = derived(page, ($page) => {
		const current = $page.url;
		const authRedirectParam = current.searchParams.get('authRedirect');
		const normalizedAuthRedirect = authRedirectParam?.startsWith('/') ? authRedirectParam : null;
		const inviteWithCode =
			current.pathname === '/invite' && current.searchParams.get('code')
				? `${current.pathname}${current.search}`
				: null;
		const target = normalizedAuthRedirect ?? inviteWithCode;
		return target ? `/auth/login?next=${encodeURIComponent(target)}` : '/auth/login';
	});
</script>

<header class="sticky top-0 z-20 border-b border-slate-200/60 bg-white/90 backdrop-blur-xl">
	<div class="mx-auto flex w-full max-w-5xl flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-8">
		<div class="flex w-full flex-col items-start gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-6">
			<a class="text-lg font-bold text-peer-navy" href="/">Peer Connect</a>
			<nav class="flex items-center gap-3 text-sm font-semibold text-slate-600">
				{#each navItems as item}
					<a
						href={item.href}
						class={`rounded-full px-3 py-1 transition hover:text-peer-indigo hover:underline ${
							$page.url.pathname.startsWith(item.href) ? 'text-peer-indigo' : ''
						}`}
					>
						{item.label}
					</a>
				{/each}
			</nav>
		</div>
		<div class="flex w-full flex-col items-start gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-4">
			{#if session}
				<span class="text-sm text-peer-navy sm:whitespace-nowrap">
					<strong>{session.user.email}</strong>님, 환영합니다.
				</span>
				<a class="btn btn-secondary whitespace-nowrap" href="/mypage">마이페이지</a>
				<form method="post" action="/auth/signout" class="m-0">
					<button type="submit" class="btn btn-primary">로그아웃</button>
				</form>
			{:else}
				<form method="post" action={$loginActionStore} class="m-0">
					<button type="submit" class="btn btn-primary">로그인</button>
				</form>
			{/if}
		</div>
	</div>
</header>
