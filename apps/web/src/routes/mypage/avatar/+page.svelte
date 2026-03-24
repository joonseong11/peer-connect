<script lang="ts">
  import { browser } from '$app/environment';
  import { ImageUp, Sparkles } from 'lucide-svelte';
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

<main class="page-shell">
  <section class="surface-panel-strong grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
    <div class="space-y-5">
      <p class="section-kicker text-peer-paper/70">프로필 사진 변경</p>
      <div class="space-y-3">
        <h1 class="headline-balance max-w-3xl text-4xl leading-[1.05] text-peer-paper sm:text-5xl">
          나를 잘 드러내는 사진으로 프로필을 정리해보세요
        </h1>
        <p class="max-w-2xl text-base leading-7 text-peer-paper/75 sm:text-lg">
          프로필 사진은 공개 프로필과 멤버 탐색에서 가장 먼저 보이는 요소입니다. 또렷하고 자연스러운
          이미지를 쓰는 편이 좋습니다.
        </p>
      </div>

      {#if loadError}
        <p
          class="rounded-[20px] border border-white/10 bg-white/10 px-4 py-3 text-sm text-peer-paper/80"
          role="alert"
        >
          {loadError}
        </p>
      {:else if form?.success}
        <p
          class="rounded-[20px] border border-white/10 bg-white/10 px-4 py-3 text-sm text-peer-paper/80"
          role="status"
        >
          프로필 사진이 업데이트되었습니다.
        </p>
      {/if}
    </div>

    <aside class="space-y-4 rounded-[24px] border border-white/10 bg-white/10 p-5">
      <div class="flex items-center gap-3">
        <div
          class="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-white/10 text-peer-paper"
        >
          <Sparkles class="h-6 w-6" />
        </div>
        <div>
          <p class="meta-line text-peer-paper/60">사진 가이드</p>
          <p class="text-xl font-semibold text-peer-paper">
            작고 선명한 이미지가 가장 안정적입니다
          </p>
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
        <div class="rounded-[20px] border border-white/10 bg-white/10 p-4">
          <p class="meta-line text-peer-paper/60">권장</p>
          <p class="mt-2 text-sm leading-6 text-peer-paper/75">얼굴이 잘 보이는 정면 사진</p>
        </div>
        <div class="rounded-[20px] border border-white/10 bg-white/10 p-4">
          <p class="meta-line text-peer-paper/60">형식</p>
          <p class="mt-2 text-sm leading-6 text-peer-paper/75">JPG, PNG 등 이미지 파일</p>
        </div>
        <div class="rounded-[20px] border border-white/10 bg-white/10 p-4">
          <p class="meta-line text-peer-paper/60">용량</p>
          <p class="mt-2 text-sm leading-6 text-peer-paper/75">최대 5MB, 업로드 전 자동 최적화</p>
        </div>
      </div>
    </aside>
  </section>

  <div class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
    <form
      method="post"
      class="section-shell flex flex-col items-center gap-6"
      enctype="multipart/form-data"
      onsubmit={() => (isSubmitting = true)}
    >
      <div class="space-y-2 text-center">
        <p class="section-kicker">미리보기</p>
        <h2 class="headline-balance text-3xl">새 프로필 사진</h2>
      </div>

      <img
        class="h-48 w-48 rounded-full border-4 border-peer-stone bg-peer-paperAlt object-cover shadow-panel"
        src={previewUrl}
        alt="프로필 사진 미리보기"
      />

      <div class="w-full space-y-3 text-center">
        <label class="btn btn-secondary relative cursor-pointer overflow-hidden">
          <ImageUp class="h-4 w-4" />
          <span>사진 선택하기</span>
          <input
            name="avatar"
            type="file"
            accept="image/*"
            onchange={handleAvatarChange}
            class="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
        <p class="text-xs text-peer-copyMuted">JPG, PNG 등 이미지 파일 · 최대 5MB</p>
        {#if form?.error}
          <p class="text-sm font-medium text-peer-danger" role="alert">{form.error}</p>
        {/if}
      </div>

      <div class="flex w-full flex-wrap items-center gap-3 border-t border-peer-stone pt-4">
        <button type="submit" class="btn btn-primary flex-1" disabled={isSubmitting}>
          {#if isSubmitting}
            저장 중…
          {:else}
            저장하기
          {/if}
        </button>
        <a class="btn btn-secondary flex-1" href="/mypage/profile">취소</a>
      </div>
    </form>

    <aside class="section-shell space-y-4">
      <div class="flex items-center gap-3">
        <div
          class="inline-flex h-11 w-11 items-center justify-center rounded-[18px] bg-peer-paperAlt text-peer-forest"
        >
          <ImageUp class="h-5 w-5" />
        </div>
        <div>
          <p class="section-kicker">체크 포인트</p>
          <h2 class="headline-balance text-2xl">업로드 전에 한 번만 확인하세요</h2>
        </div>
      </div>
      <ul class="space-y-3 text-sm leading-7 text-peer-copySoft">
        <li>얼굴이나 상반신이 적당히 보이는지</li>
        <li>배경이 너무 복잡하지 않은지</li>
        <li>작게 표시돼도 식별이 가능한지</li>
      </ul>
    </aside>
  </div>
</main>
