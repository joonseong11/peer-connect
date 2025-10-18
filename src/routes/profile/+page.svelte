<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { ActionData, PageData } from './$types';

	const { data, form } = $props<{ data: PageData; form: ActionData }>();

	const { profile, session, loadError } = data;

	const initialValues = {
		full_name: profile?.full_name ?? session?.user.user_metadata.full_name ?? '',
		role: profile?.role ?? session?.user.user_metadata.title ?? '',
		career_history: profile?.career_history ?? '',
		introduction: profile?.introduction ?? '',
		contact_linkedin: profile?.contact_linkedin ?? '',
		contact_github: profile?.contact_github ?? '',
		contact_email: profile?.contact_email ?? ''
	};

	const defaultAvatar = '/images/default-profile.svg';
	let previewUrl = $state(profile?.photo_url ?? defaultAvatar);
	let objectUrl: string | null = null;

	const submitSucceeded = $derived(form?.success ?? false);
	const values = $derived<Record<string, string>>((form?.values as Record<string, string>) ?? initialValues);
	const fieldError = (field: keyof typeof initialValues) => form?.errors?.[field] ?? null;
	const avatarError = $derived(form?.errors?.avatar ?? null);

	const handleAvatarChange = (event: Event) => {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (objectUrl) {
			URL.revokeObjectURL(objectUrl);
			objectUrl = null;
		}
		if (file) {
			objectUrl = URL.createObjectURL(file);
			previewUrl = objectUrl;
		} else {
			previewUrl = profile?.photo_url ?? defaultAvatar;
		}
	};

	$effect(() => {
		const photoFromForm = (form?.values as { photo_url?: string } | undefined)?.photo_url;
		if (typeof photoFromForm === 'string' && photoFromForm.length > 0 && !photoFromForm.startsWith('blob:')) {
			if (objectUrl) {
				URL.revokeObjectURL(objectUrl);
				objectUrl = null;
			}
			previewUrl = photoFromForm;
		} else if (!form) {
			previewUrl = profile?.photo_url ?? defaultAvatar;
		}
	});

	onDestroy(() => {
		if (objectUrl) {
			URL.revokeObjectURL(objectUrl);
		}
	});
</script>

<svelte:head>
	<title>내 프로필 · Peer Connect</title>
	<meta name="description" content="Peer Connect에서 나의 커리어와 성장 스토리를 소개하세요." />
</svelte:head>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-6 px-5 pb-16 pt-14 sm:px-8">
	<section class="glass-panel space-y-4">
		<h1 class="text-3xl font-semibold text-peer-navy">내 프로필</h1>
		<p class="text-slate-600">
			Peer Connect 멤버들이 당신을 이해할 수 있도록 경력과 강점을 자세히 작성해주세요. 작성한 내용은 초대된 멤버들에게
			공개됩니다.
		</p>
		{#if loadError}
			<p class="text-sm font-semibold text-rose-500" role="alert">{loadError}</p>
		{:else if submitSucceeded}
			<p class="text-sm font-semibold text-peer-indigo" role="status">프로필이 업데이트되었습니다.</p>
		{/if}
	</section>

	<form method="post" class="glass-panel space-y-6" enctype="multipart/form-data">
		<div class="flex flex-wrap items-center gap-5">
			<img class="h-32 w-32 rounded-3xl border-4 border-slate-200/70 bg-slate-50 object-cover" src={previewUrl} alt="내 프로필 사진 미리보기" />
			<div class="space-y-2 text-sm font-semibold text-slate-700">
				<label class="flex flex-col gap-1">
					<span>프로필 사진 (선택)</span>
					<input
						name="avatar"
						type="file"
						accept="image/*"
						onchange={handleAvatarChange}
						class="w-full max-w-xs rounded-2xl border border-slate-300/60 bg-white px-3 py-2 text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-peer-indigo/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-peer-indigo focus:outline-none focus:ring-2 focus:ring-peer-indigo/30"
					/>
				</label>
				<p class="text-xs font-normal text-slate-500">JPG, PNG 등 이미지 파일 · 최대 5MB</p>
				{#if avatarError}
					<p class="text-sm font-medium text-rose-500" role="alert">{avatarError}</p>
				{/if}
			</div>
		</div>

		<fieldset class="grid gap-5 sm:grid-cols-2">
			<label class="flex flex-col gap-2 text-sm font-semibold text-slate-700">
				<span>이름</span>
				<input
					name="full_name"
					type="text"
					placeholder="예: 김소연"
					required
					value={values.full_name}
					autocomplete="name"
					class="w-full rounded-2xl border border-slate-300/60 bg-slate-50/90 px-4 py-3 text-sm text-peer-navy shadow-sm transition focus:border-peer-indigo focus:bg-white focus:outline-none focus:ring-2 focus:ring-peer-indigo/30"
				/>
				{#if fieldError('full_name')}
					<span class="text-sm font-medium text-rose-500">{fieldError('full_name')}</span>
				{/if}
			</label>

			<label class="flex flex-col gap-2 text-sm font-semibold text-slate-700">
				<span>직군 · 포지션</span>
				<input
					name="role"
					type="text"
					placeholder="예: Senior Backend Engineer · Platform Squad"
					required
					value={values.role}
					autocomplete="organization-title"
					class="w-full rounded-2xl border border-slate-300/60 bg-slate-50/90 px-4 py-3 text-sm text-peer-navy shadow-sm transition focus:border-peer-indigo focus:bg-white focus:outline-none focus:ring-2 focus:ring-peer-indigo/30"
				/>
				{#if fieldError('role')}
					<span class="text-sm font-medium text-rose-500">{fieldError('role')}</span>
				{/if}
			</label>

			<label class="sm:col-span-2 flex flex-col gap-2 text-sm font-semibold text-slate-700">
				<span>커리어 주요 이력 및 교육</span>
				<textarea
					name="career_history"
					rows={5}
					placeholder={`회사 · 팀 · 기간을 줄바꿈으로 정리해주세요.
예) 토스 · Platform Squad (2022-현재)
네이버 · Search Infra (2018-2022)`}
					class="min-h-[160px] w-full rounded-2xl border border-slate-300/60 bg-slate-50/90 px-4 py-3 text-sm text-peer-navy shadow-sm transition focus:border-peer-indigo focus:bg-white focus:outline-none focus:ring-2 focus:ring-peer-indigo/30"
				>{values.career_history}</textarea>
			</label>

			<label class="sm:col-span-2 flex flex-col gap-2 text-sm font-semibold text-slate-700">
				<span>소개</span>
				<textarea
					name="introduction"
					rows={6}
					placeholder="어떤 문제를 좋아하고, 어떻게 팀과 함께 성장했는지 자유롭게 작성해주세요."
					class="min-h-[180px] w-full rounded-2xl border border-slate-300/60 bg-slate-50/90 px-4 py-3 text-sm text-peer-navy shadow-sm transition focus:border-peer-indigo focus:bg-white focus:outline-none focus:ring-2 focus:ring-peer-indigo/30"
				>{values.introduction}</textarea>
			</label>

			<div class="sm:col-span-2 space-y-3">
				<div class="space-y-1">
					<h3 class="text-sm font-semibold text-slate-700">연락망</h3>
				</div>
				<div class="grid gap-4 sm:grid-cols-2">
					<label class="flex flex-col gap-2 text-sm font-semibold text-slate-700">
						<span>LinkedIn</span>
						<input
							name="contact_linkedin"
							type="url"
							placeholder="https://www.linkedin.com/in/username"
							value={values.contact_linkedin}
							class="w-full rounded-2xl border border-slate-300/60 bg-slate-50/90 px-4 py-3 text-sm text-peer-navy shadow-sm transition focus:border-peer-indigo focus:bg-white focus:outline-none focus:ring-2 focus:ring-peer-indigo/30"
						/>
						{#if fieldError('contact_linkedin')}
							<span class="text-sm font-medium text-rose-500">{fieldError('contact_linkedin')}</span>
						{/if}
					</label>

					<label class="flex flex-col gap-2 text-sm font-semibold text-slate-700">
						<span>GitHub</span>
						<input
							name="contact_github"
							type="url"
							placeholder="https://github.com/username"
							value={values.contact_github}
							class="w-full rounded-2xl border border-slate-300/60 bg-slate-50/90 px-4 py-3 text-sm text-peer-navy shadow-sm transition focus:border-peer-indigo focus:bg-white focus:outline-none focus:ring-2 focus:ring-peer-indigo/30"
						/>
						{#if fieldError('contact_github')}
							<span class="text-sm font-medium text-rose-500">{fieldError('contact_github')}</span>
						{/if}
					</label>

					<label class="sm:col-span-2 flex flex-col gap-2 text-sm font-semibold text-slate-700">
						<span>이메일</span>
						<input
							name="contact_email"
							type="email"
							placeholder="peerconnect@example.com"
							value={values.contact_email}
							class="w-full rounded-2xl border border-slate-300/60 bg-slate-50/90 px-4 py-3 text-sm text-peer-navy shadow-sm transition focus:border-peer-indigo focus:bg-white focus:outline-none focus:ring-2 focus:ring-peer-indigo/30"
						/>
						{#if fieldError('contact_email')}
							<span class="text-sm font-medium text-rose-500">{fieldError('contact_email')}</span>
						{/if}
					</label>
				</div>
			</div>
		</fieldset>

		{#if form?.serverMessage}
			<p class="text-sm font-semibold text-rose-500" role="alert">{form.serverMessage}</p>
		{/if}

		<div class="flex flex-wrap items-center gap-3">
			<button type="submit" class="btn btn-primary">프로필 저장</button>
			<a class="btn btn-secondary" href="/">홈으로 돌아가기</a>
		</div>
	</form>
</main>
