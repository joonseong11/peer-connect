<script lang="ts">
	import { browser } from '$app/environment';
	import { onDestroy } from 'svelte';
	import { createBrowserClient } from '@supabase/ssr';
	import type { Session, SupabaseClient } from '@supabase/supabase-js';
	import { getSupabaseConfig } from '$lib/supabase/config';

	const featureHighlights = [
		{
			title: '프라이빗 초대',
			description:
				'멤버마다 2장의 초대장을 사용하여 신뢰받는 동료 개발자들을 네트워크에 초대할 수 있습니다.'
		},
		{
			title: '믿을 수 있는 동료의 프로필',
			description:
				'직군, 커리어, 프로젝트 경험과 성장 스토리를 담아 나를 입체적으로 소개하세요. 함께했던 동료들의 추천서까지 확인할 수 있습니다.'
		},
		{
			title: '당신과 함께 성장하는 모임',
			description:
				'커피챗, 모각코, 라이트닝 토크, 세미나, 스터디그룹, 사이드프로젝트, 해커톤, 컨퍼런스 등 누구나 다양한 모임을 만들고 교류할 수 있습니다.'
		}
	];

	const inviteFlow = [
		{
			label: '1',
			title: '초대장 발급',
			copy: '신뢰하는 동료를 초대하세요.'
		},
		{
			label: '2',
			title: '추천서 남기기',
			copy: '프로필을 작성하고 동료들에게 추천서를 남겨보세요.'
		},
		{
			label: '3',
			title: '동료들과 교류하기',
			copy: '다양한 모임을 만들고 참여해보세요.'
		}
	];

	const defaultAvatar = '/images/default-profile.svg';

	const sampleProfile = {
		name: '김박사',
		role: 'Senior Backend Engineer · 5년차',
		intro:
			'대규모 데이터 파이프라인과 DevOps 문화를 사랑합니다. 실험을 빠르게 반복하고 팀이 성장할 수 있도록 돕는 일을 즐겨요.',
		career: ['토스 · Platform Squad (2024-현재)', '네이버 · Search Infra (2020-2024)', 'KAIST 전산학부 졸업'],
		photo: defaultAvatar
	};

	const endorsements = [
		{
			author: '홍길동 · Product Engineer',
			message:
				'함께 모놀리스를 마이크로서비스로 분리할 때, 소연님의 리딩 덕분에 전환 기간을 절반으로 줄일 수 있었어요.'
		},
		{
			author: '고길동 · ML Engineer',
			message: '복잡한 요구사항도 명확하게 정리해주는 커뮤니케이션 능력이 탁월합니다.'
		}
	];

	const boardIdeas = [
		'아침 30분 데일리 테크 스탠드업',
		'LLM 프롬프트 엔지니어링 스터디',
		'Kubernetes 실전 워크숍',
		'사이드 프로젝트 파트너 매칭',
		'월간 멘토링 세션'
	];

	const { data } = $props<{ data: App.PageData }>();

	let localSession = $state(data.session);
	const session = $derived(localSession);
	let authError = $state<string | null>(data.authErrorMessage ?? null);
	let supabase: SupabaseClient | null = null;
const invitesEnabled = $derived(data.invitesEnabled ?? false);
const authRedirectTarget = $derived(data.authRedirectTarget ?? null);

	if (browser) {
		const initSupabaseClient = () => {
			const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
			let client = supabase;
			if (!client) {
				client = createBrowserClient(supabaseUrl, supabaseAnonKey, { isSingleton: true });
				supabase = client;
			}

			if (!client) {
				console.error('Supabase 클라이언트를 초기화하지 못했습니다.');
				return;
			}

			const ensuredClient = client as SupabaseClient;

			const {
				data: { subscription }
			} = ensuredClient.auth.onAuthStateChange((_event, newSession: Session | null) => {
				localSession = newSession;
			});

			onDestroy(() => {
				subscription.unsubscribe();
			});
		};

		initSupabaseClient();
	}

	$effect(() => {
		localSession = data.session;
	});

	const handleGoogleSignIn = async () => {
		authError = null;

		const client = supabase;

		if (!client) {
			authError = '인증 클라이언트를 초기화하지 못했습니다. 새로고침 후 다시 시도해주세요.';
			return;
		}

	const ensuredClient = client as SupabaseClient;

	const nextParam = authRedirectTarget ? `?next=${encodeURIComponent(authRedirectTarget)}` : '';

	const { error } = await ensuredClient.auth.signInWithOAuth({
		provider: 'google',
		options: {
			redirectTo: `${window.location.origin}/auth/callback${nextParam}`
		}
	});

		if (error) {
			console.error('Google sign-in error', error);
			authError = '로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
		}
	};
</script>

<svelte:head>
	<title>Peer Connect · 함께 성장하는 개발자 커뮤니티</title>
	<meta
		name="description"
		content="초대 기반 프라이빗 개발자 네트워크, Peer Connect에서 깊이 있는 동료와 함께 성장하세요."
	/>
</svelte:head>

<main class="mx-auto flex w-full max-w-5xl flex-col gap-14 px-5 pb-20 pt-16 sm:px-8 lg:gap-16">
	<section class="glass-panel grid gap-10 md:grid-cols-2 md:items-center lg:p-12">
		<div class="space-y-5">
			<p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">PEER CONNECT</p>
			<h1 class="text-3xl leading-tight text-peer-navy sm:text-4xl">
				당신과 함께 성장하는<br />프라이빗 개발자 네트워크
			</h1>
			<p class="max-w-xl text-base text-slate-600 sm:text-lg">
				혼자서는 정보도 기회도 놓치기 쉽습니다. <br/>지금, 동료들과 연결되어 새로운 가능성을 여세요. <br/>함께 성장할 때, 배움은 더 빠르고 길도 더 선명해집니다.<br/><br/>
				믿을 수 있는 동료들과 함께 성장하세요. <br/>간단한 식사 자리와 같은 밋업부터 세미나와 같은 기술적인 토론까지 동료들과 교류할 수 있습니다.
			</p>
			<div class="flex flex-wrap items-center gap-3 pt-2">
				{#if session}
					<a class="btn btn-primary" href="/profile">내 프로필 관리</a>
					<a class="btn btn-secondary" href="/members">동료 프로필 둘러보기</a>
				{:else}
					<button class="btn btn-primary" onclick={handleGoogleSignIn}>Google 계정으로 시작하기</button>
					<a class="btn btn-secondary" href="/members">동료 프로필 둘러보기</a>
				{/if}
			</div>
			{#if authError}
				<p class="text-sm font-medium text-rose-400" role="alert">{authError}</p>
			{/if}
		</div>
		<div class="flex justify-center md:justify-end">
			<div class="preview-card md:ml-auto">
				<span class="text-xs font-semibold uppercase tracking-[0.08em] text-rose-500">멤버 지수</span>
				<p class="text-lg font-semibold text-slate-800">새로운 추천서 도착</p>
				<p class="text-sm leading-relaxed text-slate-600">
					“네트워크 인프라 전환 프로젝트에서 빠르게 학습하고 팀에 기여한 모습이 인상적이었어요.”
				</p>
				<div class="flex justify-between text-xs text-slate-500">
					<span>작성: 팀 리더</span>
					<span>방금 전</span>
				</div>
			</div>
		</div>
	</section>

	<section class="grid gap-6 md:grid-cols-3">
		{#each featureHighlights as feature}
			<article class="glass-panel space-y-3 p-8 sm:p-9">
				<h3 class="text-xl font-semibold text-peer-navy">{feature.title}</h3>
				<p class="text-slate-600">{feature.description}</p>
			</article>
		{/each}
	</section>

	<section class="glass-panel space-y-6">
		<h2 class="text-3xl font-semibold text-peer-navy">초대 기반으로 더 단단하게 연결돼요</h2>
		<div class="grid gap-6 sm:grid-cols-3">
			{#each inviteFlow as step}
				<div class="flex items-start gap-4">
					<span class="badge-step">{step.label}</span>
					<div class="space-y-1.5">
						<h3 class="text-lg font-semibold text-peer-navy">{step.title}</h3>
						<p class="text-slate-600">{step.copy}</p>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<section class="glass-panel grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
		<div class="space-y-4">
			<h2 class="text-3xl font-semibold text-peer-navy">나를 보여주는 프로필</h2>
			<p class="text-slate-600">
				기술 스택과 커리어 히스토리, 프로젝트 경험, 관심분야 등 자기소개를 자유롭게 작성하고, 동료들에게 추천서를 남겨보세요.
				프로필은 초대받은 PEER CONNECT 멤버들에게 공개됩니다.
			</p>
			{#if session}
				<a class="btn btn-ghost" href="/profile">내 프로필 작성하기</a>
			{:else}
				<button
					class="btn btn-ghost btn-requires-auth"
					type="button"
					onclick={handleGoogleSignIn}
					title="Google 로그인 후 프로필을 작성할 수 있어요."
				>
					Google 로그인 후 시작
				</button>
			{/if}
			{#if !session}
				<p class="text-sm text-slate-500">지금 Google로 로그인하고 내 프로필을 작성해보세요.</p>
			{/if}
		</div>
		<div class="rounded-3xl border border-slate-200/60 bg-white/80 p-8 shadow-lg backdrop-blur-xl sm:p-9">
			<header class="space-y-1">
				<h3 class="text-2xl font-semibold text-peer-navy">{sampleProfile.name}</h3>
				<p class="text-sm text-slate-500">{sampleProfile.role}</p>
			</header>
			<img
				class="mt-6 h-24 w-24 rounded-full border-2 border-slate-300/60 bg-slate-50 object-cover"
				src={sampleProfile.photo}
				alt={`${sampleProfile.name} 프로필 이미지`}
			/>
			<section class="mt-6 space-y-2">
				<h4 class="text-lg font-semibold text-peer-navy">소개</h4>
				<p class="text-slate-600">{sampleProfile.intro}</p>
			</section>
			<section class="mt-6 space-y-3">
				<h4 class="text-lg font-semibold text-peer-navy">커리어</h4>
				<ul class="space-y-2">
					{#each sampleProfile.career as item}
						<li class="relative pl-5 text-slate-600 before:absolute before:left-0 before:top-2 before:h-2 before:w-2 before:rounded-full before:bg-gradient-to-br before:from-peer-sky before:to-peer-indigo before:content-['']">
							{item}
						</li>
					{/each}
				</ul>
			</section>
			<section class="mt-6 space-y-3">
				<h4 class="text-lg font-semibold text-peer-navy">동료 추천</h4>
				<div class="flex flex-col gap-3">
					{#each endorsements as endorsement}
						<article class="rounded-2xl border border-indigo-200/70 bg-indigo-50/70 p-4 text-indigo-900 shadow-sm">
							<p class="text-sm leading-relaxed">“{endorsement.message}”</p>
							<span class="mt-2 block text-xs font-semibold text-indigo-600">{endorsement.author}</span>
						</article>
					{/each}
				</div>
			</section>
		</div>
	</section>

	<section class="glass-panel grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
		<div class="space-y-4">
			<h2 class="text-3xl font-semibold text-peer-navy">모임 라운지</h2>
			<p class="text-slate-600">
				커피챗, 모각코, 라이트닝 토크, 세미나, 스터디그룹, 사이드프로젝트, 해커톤, 컨퍼런스 등의 다양한 모임을 직접 만들고 참여하세요.
				누구나 모임 라운지에 글을 작성하고 수정할 수 있으며, <strong class="font-semibold text-peer-navy">등록된 글은 알림을 허락한 모든 멤버에게 이메일로 안내됩니다.</strong>
			</p>
			<div class="pt-2">
				<a class="btn btn-primary" href="/gatherings">모임 라운지 살펴보기</a>
			</div>
		</div>
		<ul class="grid gap-3">
			{#each boardIdeas as idea}
				<li class="rounded-xl border border-emerald-200/60 bg-emerald-100/70 px-4 py-3 font-semibold text-emerald-700">
					{idea}
				</li>
			{/each}
		</ul>
	</section>

	<section class="glass-panel space-y-4 text-center md:text-left">
		<h2 class="text-3xl font-semibold text-peer-navy">이제 Peer Connect에서 동료와 함께 성장해요</h2>
		<p class="text-slate-600">
			초대권을 발급해 신뢰할 수 있는 동료를 초대하세요.
		</p>
		<div class="flex flex-wrap justify-center gap-3 pt-2 md:justify-start">
			{#if invitesEnabled}
				<a class="btn btn-primary" href="/invite">초대권 관리</a>
				<a class="btn btn-secondary" href="/members">동료 프로필 보기</a>
			{:else}
				<a class="btn btn-primary" href="/members">동료 프로필 둘러보기</a>
				<a class="btn btn-secondary" href="/profile">내 프로필 작성하기</a>
			{/if}
		</div>
	</section>
</main>
