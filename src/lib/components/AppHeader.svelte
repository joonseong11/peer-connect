<script lang="ts">
	import type { Session } from '@supabase/supabase-js';

	const { session } = $props<{ session: Session | null }>();
</script>

<header class="sticky top-0 z-20 border-b border-slate-200/60 bg-white/90 backdrop-blur-xl">
	<div class="mx-auto flex w-full max-w-5xl flex-col items-start gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-8">
		<a class="text-lg font-bold text-peer-navy" href="/">Peer Connect</a>
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
				<form method="post" action="/auth/login" class="m-0">
					<button type="submit" class="btn btn-primary">로그인</button>
				</form>
			{/if}
		</div>
	</div>
</header>
