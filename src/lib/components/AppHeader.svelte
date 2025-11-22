<script lang="ts">
	import type { Session } from '@supabase/supabase-js';
	import { page } from '$app/stores';
	import { derived } from 'svelte/store';
        import { LogOut, UserRound } from 'lucide-svelte';

	const { session } = $props<{ session: Session | null }>();

	const authedNavItems = [
		{ href: '/members', label: '멤버' },
		{ href: '/gatherings', label: '모임 라운지' }
	];

const guestNavItems = [
	{ href: '/#features', label: '소개' },
	{ href: '/#gatherings', label: '모임 라운지' }
];

	const loginActionStore = derived(page, ($page) => {
		const current = $page.url;
		const authRedirectParam = current.searchParams.get('authRedirect')
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
		<div class="flex w-full whitespace-nowrap items-center justify-between gap-3 sm:flex-row sm:items-center sm:gap-6">
			<div class="flex items-center gap-3">
				<a class="text-lg font-bold text-peer-navy" href="/">Peer Connect</a>
				<nav class="flex items-center gap-1 text-sm font-semibold text-slate-600">
					{#if session}
						{#each authedNavItems as item}
							<a
								href={item.href}
								class={`rounded-full px-2 py-1 transition hover:text-peer-indigo  ${
									$page.url.pathname.startsWith(item.href) ? 'text-peer-indigo' : ''
								}`}
							>
								{item.label}
							</a>
						{/each}
					{:else}
						{#each guestNavItems as item}
							<a href={item.href} class="rounded-full px-2 py-1 transition hover:text-peer-indigo ">
								{item.label}
							</a>
						{/each}
					{/if}
				</nav>
			</div>	

			<div class="flex w-full items-center gap-1 sm:w-auto sm:flex-row sm:items-center justify-end sm:gap-4">
				{#if session}
					<span class="text-sm text-peer-navy sm:whitespace-nowrap hidden sm:block">
						<strong>{session.user.email}</strong>님, 환영합니다.
					</span>
					<a
						class="inline-flex items-center justify-center rounded-full p-2 text-slate-600 transition hover:bg-slate-100 hover:text-peer-indigo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peer-indigo/60 focus-visible:ring-offset-2"
						href="/mypage"
						title="마이페이지"
					>
                                                <UserRound class="h-5 w-5" />
                                        </a>
					<form method="post" action="/auth/signout" class="m-0">
						<button
							type="submit"
							class="inline-flex items-center justify-center rounded-full p-2 text-slate-600 transition hover:bg-slate-100 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/60 focus-visible:ring-offset-2"
							title="로그아웃"
						>
							<LogOut class="h-5 w-5" />
						</button>
					</form>
				{:else}
					<form method="post" action={$loginActionStore} class="m-0">
						<button type="submit" class="sm:btn sm:btn-primary text-sm font-semibold text-slate-600">로그인</button>
					</form>
				{/if}
			</div>
		</div>
	</div>
</header>