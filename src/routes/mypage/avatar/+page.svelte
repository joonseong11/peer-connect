<script lang="ts">
  import { browser } from '$app/environment';
  import { onDestroy } from 'svelte';
  import MetaTags from '$lib/components/MetaTags.svelte';
  import type { ActionData, PageData } from './$types';

  const { data, form } = $props<{ data: PageData; form: ActionData }>();
  const { profile, loadError } = data;

  const defaultAvatar = '/images/default-profile.svg';
  let previewUrl = $state(profile?.photo_url ?? defaultAvatar);
  let objectUrl: string | null = null;
  let isSubmitting = $state(false);

  const MAX_AVATAR_DIMENSION = 512;
  const TARGET_MAX_SIZE = 140 * 1024;

  const compressImage = async (file: File) => {
    if (!browser || !file.type.startsWith('image/')) {
      return file;
    }

    try {
      const imageBitmap = await createImageBitmap(file);
      const { width, height } = imageBitmap;
      const scale = Math.min(1, MAX_AVATAR_DIMENSION / Math.max(width, height));
      const targetWidth = Math.max(1, Math.round(width * scale));
      const targetHeight = Math.max(1, Math.round(height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const context = canvas.getContext('2d');
      if (!context) {
        imageBitmap.close();
        return file;
      }

      context.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);
      imageBitmap.close();

      const qualities = [0.82, 0.72, 0.62, 0.52];
      let blob: Blob | null = null;
      for (const quality of qualities) {
        blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((result) => resolve(result), 'image/jpeg', quality)
        );
        if (!blob) {
          continue;
        }
        if (blob.size <= TARGET_MAX_SIZE || quality === qualities[qualities.length - 1]) {
          break;
        }
      }

      if (!blob || blob.size >= file.size) {
        return file;
      }

      const normalizedName = file.name.replace(/\.[^/.]+$/, '') || 'avatar';
      return new File([blob], `${normalizedName}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now()
      });
    } catch (error) {
      console.error('[profile] Failed to compress avatar', error);
      return file;
    }
  };

  const handleAvatarChange = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
    if (file) {
      const processedFile = await compressImage(file);
      if (processedFile !== file) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(processedFile);
        input.files = dataTransfer.files;
      }
      objectUrl = URL.createObjectURL(input.files?.[0] ?? file);
      previewUrl = objectUrl;
    } else {
      previewUrl = profile?.photo_url ?? defaultAvatar;
    }
  };

  $effect(() => {
    if (form?.success && form.photo_url) {
      previewUrl = form.photo_url;
      isSubmitting = false;
    } else if (form?.error) {
      isSubmitting = false;
    }
  });

  onDestroy(() => {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  });
</script>

<MetaTags
  title="프로필 사진 변경 · Peer Connect"
  description="프로필 사진을 업로드하고 교체할 수 있습니다."
  path="/mypage/avatar"
  type="website"
/>

<main class="mx-auto flex w-full max-w-xl flex-col gap-6 px-5 pb-16 pt-14 sm:px-8">
  <section class="glass-panel space-y-4 text-center">
    <h1 class="text-2xl font-semibold text-peer-navy">프로필 사진 변경</h1>
    <p class="text-slate-600">나를 잘 나타내는 사진으로 변경해보세요.</p>
    {#if loadError}
      <p class="text-sm font-semibold text-rose-500" role="alert">{loadError}</p>
    {:else if form?.success}
      <p class="text-sm font-semibold text-peer-indigo" role="status">
        프로필 사진이 업데이트되었습니다.
      </p>
    {/if}
  </section>

  <form
    method="post"
    class="glass-panel flex flex-col items-center gap-6"
    enctype="multipart/form-data"
    onsubmit={() => (isSubmitting = true)}
  >
    <img
      class="h-40 w-40 rounded-full border-4 border-slate-200/70 bg-slate-50 object-cover shadow-md"
      src={previewUrl}
      alt="프로필 사진 미리보기"
    />

    <div class="w-full space-y-2 text-center">
      <label class="btn btn-secondary relative cursor-pointer overflow-hidden">
        <span>사진 선택하기</span>
        <input
          name="avatar"
          type="file"
          accept="image/*"
          onchange={handleAvatarChange}
          class="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <p class="text-xs text-slate-500">JPG, PNG 등 이미지 파일 · 최대 5MB</p>
      {#if form?.error}
        <p class="text-sm font-medium text-rose-500" role="alert">{form.error}</p>
      {/if}
    </div>

    <div class="flex w-full gap-3">
      <button type="submit" class="btn btn-primary flex-1" disabled={isSubmitting}>
        {#if isSubmitting}
          <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
              fill="none"
            />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <span>저장 중…</span>
        {:else}
          저장하기
        {/if}
      </button>
      <a class="btn btn-secondary flex-1" href="/mypage/profile">취소</a>
    </div>
  </form>
</main>
