<script lang="ts">
  import {
    ArrowRight,
    CalendarDays,
    MessageCircleMore,
    PencilLine,
    Trash2,
    UserRound
  } from 'lucide-svelte';
  import MetaTags from '$lib/components/MetaTags.svelte';
  import type { ActionData, PageData } from './$types';

  type GatheringActionData = ActionData & { parentCommentId?: string | null };
  type LoungeFormat = '커피챗' | '스터디' | '세미나' | '사이드프로젝트' | '모각코' | '네트워킹';
  type LoungeStatus = '모집 중' | '대화 시작' | '회고 공유';

  const { data, form } = $props<{ data: PageData; form: GatheringActionData }>();

  const { session, post, comments, loadError } = data;
  const isAuthor = $derived(session?.user.id === post.author_id);

  const metaDescription =
    post.content.length > 160 ? `${post.content.slice(0, 160)}…` : post.content;
  const metaPath = `/gatherings/${post.id}`;

  let editingPost = $state(false);
  let postDraft = $state({
    title: post.title,
    content: post.content
  });

  let commentDraft = $state('');
  let editingCommentId = $state<string | null>(null);
  let editingCommentContent = $state('');
  let replyingToCommentId = $state<string | null>(null);
  let replyDraft = $state('');

  let handledForm: GatheringActionData | null = null;
  let postUpdateSubmitting = $state(false);
  let postDeleteSubmitting = $state(false);
  let topCommentSubmitting = $state(false);
  let replySubmittingForId = $state<string | null>(null);
  let commentUpdateSubmittingId = $state<string | null>(null);
  let commentDeleteSubmittingId = $state<string | null>(null);

  $effect(() => {
    if (form !== handledForm) {
      handledForm = form ?? null;
      postUpdateSubmitting = false;
      postDeleteSubmitting = false;
      topCommentSubmitting = false;
      replySubmittingForId = null;
      commentUpdateSubmittingId = null;
      commentDeleteSubmittingId = null;
    }
  });

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
      if (form.parentCommentId) {
        if (form.success && replyingToCommentId === form.parentCommentId) {
          replyingToCommentId = null;
          replyDraft = '';
        } else if (form.values?.content) {
          replyingToCommentId = form.parentCommentId;
          replyDraft = form.values.content;
        }
      } else if (form.success) {
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
    }
  });

  const handlePostUpdateSubmit = () => {
    postUpdateSubmitting = true;
  };

  const handlePostDeleteSubmit = () => {
    postDeleteSubmitting = true;
  };

  const handleCommentCreateSubmit = (parentId: string | null = null) => {
    if (parentId) {
      replySubmittingForId = parentId;
    } else {
      topCommentSubmitting = true;
      replySubmittingForId = null;
    }
  };

  const handleCommentUpdateSubmit = (commentId: string) => {
    commentUpdateSubmittingId = commentId;
  };

  const handleCommentDeleteSubmit = (commentId: string) => {
    commentDeleteSubmittingId = commentId;
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

  const urlPattern = /https?:\/\/[^\s]+/g;
  const hasLinks = $derived(/https?:\/\/[^\s]+/.test(post.content));

  const parseLine = (line: string) => {
    const segments: { type: 'text' | 'link'; value: string }[] = [];
    let lastIndex = 0;

    for (const match of line.matchAll(urlPattern)) {
      if (match.index === undefined) continue;
      if (match.index > lastIndex) {
        segments.push({ type: 'text', value: line.slice(lastIndex, match.index) });
      }

      segments.push({ type: 'link', value: match[0] });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < line.length) {
      segments.push({ type: 'text', value: line.slice(lastIndex) });
    }

    return segments.length ? segments : [{ type: 'text', value: line }];
  };

  const detectFormat = (): LoungeFormat => {
    const source = `${post.title} ${post.content}`.toLowerCase();

    if (source.includes('커피챗') || source.includes('coffee')) return '커피챗';
    if (
      source.includes('스터디') ||
      source.includes('study') ||
      source.includes('워크숍') ||
      source.includes('workshop')
    ) {
      return '스터디';
    }
    if (
      source.includes('세미나') ||
      source.includes('토크') ||
      source.includes('발표') ||
      source.includes('meetup')
    ) {
      return '세미나';
    }
    if (
      source.includes('사이드') ||
      source.includes('프로젝트') ||
      source.includes('project') ||
      source.includes('해커톤')
    ) {
      return '사이드프로젝트';
    }
    if (
      source.includes('모각코') ||
      source.includes('함께 코딩') ||
      source.includes('pair') ||
      source.includes('코딩')
    ) {
      return '모각코';
    }
    return '네트워킹';
  };

  const detectStatus = (): LoungeStatus => {
    const source = `${post.title} ${post.content}`.toLowerCase();

    if (source.includes('회고') || source.includes('후기') || source.includes('정리')) {
      return '회고 공유';
    }

    if (
      source.includes('모집') ||
      source.includes('구해') ||
      source.includes('함께') ||
      source.includes('참여') ||
      source.includes('오실 분')
    ) {
      return '모집 중';
    }

    return '대화 시작';
  };

  const gatheringFormat = $derived(detectFormat());
  const gatheringStatus = $derived(detectStatus());
  const totalReplies = $derived(
    comments.reduce(
      (count: number, comment: (typeof comments)[number]) => count + comment.replies.length,
      0
    )
  );
</script>

<MetaTags
  title={`${post.title} · 모임 라운지 · Peer Connect`}
  description={metaDescription}
  path={metaPath}
  type="article"
/>

<main class="page-shell">
  <section class="surface-panel-strong grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
    <div class="space-y-5">
      <a
        class="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-peer-paper/70 transition hover:bg-white/15 hover:text-peer-paper hover:no-underline"
        href="/gatherings"
      >
        <span aria-hidden="true">←</span>
        모임 목록
      </a>

      <div class="flex flex-wrap gap-2">
        <span
          class="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-peer-paper"
        >
          {gatheringFormat}
        </span>
        <span
          class="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-peer-paper"
        >
          {gatheringStatus}
        </span>
      </div>

      <div class="space-y-3">
        <h1 class="headline-balance max-w-3xl text-4xl leading-[1.05] text-peer-paper sm:text-5xl">
          {post.title}
        </h1>
        <p class="max-w-3xl text-base leading-7 text-peer-paper/75 sm:text-lg">
          {post.content.length > 160 ? `${post.content.slice(0, 160).trim()}…` : post.content}
        </p>
      </div>

      <div class="flex flex-wrap gap-3">
        <div class="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm">
          댓글 {comments.length + totalReplies}개
        </div>
        <div class="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm">
          작성 {formatDate(post.created_at)}
        </div>
        {#if post.updated_at && post.updated_at !== post.created_at}
          <div class="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm">
            수정 {formatDate(post.updated_at)}
          </div>
        {/if}
      </div>

      <div class="flex flex-wrap gap-3">
        <a class="btn btn-primary" href="#comment-composer">
          <span>댓글로 참여 의사 남기기</span>
          <ArrowRight class="h-4 w-4" />
        </a>
        {#if isAuthor}
          <button
            type="button"
            class="btn btn-secondary border-white/15 bg-white/10 text-peer-paper hover:bg-white/15"
            onclick={() => (editingPost = !editingPost)}
          >
            <PencilLine class="h-4 w-4" />
            <span>{editingPost ? '수정 취소' : '게시글 수정'}</span>
          </button>
        {/if}
      </div>
    </div>

    <aside class="space-y-4 rounded-[24px] border border-white/10 bg-white/10 p-5">
      <div class="flex items-center gap-4">
        <img
          class="h-16 w-16 rounded-[20px] border border-white/10 bg-white/10 object-cover"
          src={post.author?.photo_url ?? '/images/default-profile.svg'}
          alt={(post.author?.full_name ?? '알 수 없는 멤버') + '의 프로필 이미지'}
        />
        <div class="space-y-1">
          <p class="meta-line text-peer-paper/55">주최자</p>
          <h2 class="text-2xl text-peer-paper">{post.author?.full_name ?? '알 수 없는 멤버'}</h2>
          <p class="text-sm text-peer-paper/70">{post.author?.role ?? '역할 미입력'}</p>
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <div class="rounded-[20px] border border-white/10 bg-white/10 p-4">
          <p class="meta-line text-peer-paper/55">참여 방식</p>
          <p class="mt-2 text-sm leading-6 text-peer-paper/75">
            댓글로 참여 의사와 간단한 자기소개를 남기면 호스트와 대화가 시작됩니다.
          </p>
        </div>
        <div class="rounded-[20px] border border-white/10 bg-white/10 p-4">
          <p class="meta-line text-peer-paper/55">유용한 정보</p>
          <p class="mt-2 text-sm leading-6 text-peer-paper/75">
            {#if hasLinks}
              본문에 링크가 포함되어 있어요. 세부 참여 정보나 참고 자료를 함께 확인해보세요.
            {:else}
              세부 내용은 본문과 댓글에서 이어집니다. 필요한 정보가 보이지 않으면 댓글로 질문하세요.
            {/if}
          </p>
        </div>
      </div>

      {#if isAuthor}
        <form
          method="post"
          action="?/deletePost"
          onsubmit={(event) => {
            if (!confirm('게시글을 삭제하시겠어요?')) {
              event.preventDefault();
              return;
            }
            handlePostDeleteSubmit();
          }}
        >
          <button
            type="submit"
            class="btn w-full border border-white/10 bg-white/10 text-peer-paper hover:bg-white/15"
            disabled={postDeleteSubmitting}
          >
            <Trash2 class="h-4 w-4" />
            <span>{postDeleteSubmitting ? '삭제 중...' : '게시글 삭제'}</span>
          </button>
        </form>
      {/if}
    </aside>
  </section>

  <div class="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
    <article class="section-shell space-y-6">
      {#if editingPost}
        <form
          class="space-y-4"
          method="post"
          action="?/updatePost"
          onsubmit={handlePostUpdateSubmit}
        >
          <div class="space-y-2">
            <p class="section-kicker">Edit post</p>
            <h2 class="text-3xl">모임 내용 수정</h2>
          </div>
          <label class="flex flex-col gap-2 text-sm font-medium text-peer-copy">
            <span>제목</span>
            <input
              name="title"
              type="text"
              required
              bind:value={postDraft.title}
              class="field-shell"
            />
            {#if form?.intent === 'updatePost' && form.errors?.title}
              <p class="text-sm font-medium text-peer-danger">{form.errors.title}</p>
            {/if}
          </label>
          <label class="flex flex-col gap-2 text-sm font-medium text-peer-copy">
            <span>내용</span>
            <textarea
              name="content"
              rows={10}
              required
              bind:value={postDraft.content}
              class="field-shell min-h-[240px]"
            ></textarea>
            {#if form?.intent === 'updatePost' && form.errors?.content}
              <p class="text-sm font-medium text-peer-danger">{form.errors.content}</p>
            {/if}
          </label>
          {#if form?.intent === 'updatePost' && form.serverMessage}
            <p class="text-sm font-medium text-peer-danger">{form.serverMessage}</p>
          {/if}
          <div class="flex flex-wrap gap-3">
            <button type="submit" class="btn btn-primary" disabled={postUpdateSubmitting}>
              <span>{postUpdateSubmitting ? '저장 중...' : '게시글 저장'}</span>
            </button>
            <button type="button" class="btn btn-secondary" onclick={() => (editingPost = false)}>
              수정 취소
            </button>
          </div>
        </form>
      {:else}
        <div class="space-y-3">
          <p class="section-kicker">모임 소개</p>
          <h2 class="headline-balance text-3xl">모임 소개</h2>
        </div>
        <div class="space-y-4 text-base leading-8 text-peer-copy">
          {#each post.content.split('\n') as line, index (index)}
            <p class="whitespace-pre-wrap break-words">
              {#each parseLine(line) as segment, segmentIndex (segmentIndex)}
                {#if segment.type === 'link'}
                  <a
                    class="break-words text-peer-forest underline"
                    href={segment.value}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {segment.value}
                  </a>
                {:else}
                  {segment.value}
                {/if}
              {/each}
            </p>
          {/each}
        </div>
      {/if}
    </article>

    <aside class="space-y-6">
      <section class="section-shell space-y-4">
        <div class="flex items-center gap-3">
          <div
            class="inline-flex h-11 w-11 items-center justify-center rounded-[18px] bg-peer-paperAlt text-peer-forest"
          >
            <UserRound class="h-5 w-5" />
          </div>
          <div>
            <p class="section-kicker">주최자 정보</p>
            <h2 class="headline-balance text-2xl">주최자</h2>
          </div>
        </div>
        <div class="surface-panel-muted space-y-3">
          <p class="text-lg font-semibold text-peer-ink">
            {post.author?.full_name ?? '알 수 없는 멤버'}
          </p>
          <p class="text-sm text-peer-copySoft">{post.author?.role ?? '역할 미입력'}</p>
          <a
            class="inline-flex items-center gap-2 text-sm font-semibold text-peer-forest hover:no-underline"
            href={`/members/${post.author_id}`}
          >
            프로필 보기
            <ArrowRight class="h-4 w-4" />
          </a>
        </div>
      </section>

      <section class="section-shell space-y-4">
        <div class="flex items-center gap-3">
          <div
            class="inline-flex h-11 w-11 items-center justify-center rounded-[18px] bg-peer-paperAlt text-peer-amber"
          >
            <CalendarDays class="h-5 w-5" />
          </div>
          <div>
            <p class="section-kicker">참여 정보</p>
            <h2 class="headline-balance text-2xl">참여 정보</h2>
          </div>
        </div>
        <ul class="space-y-3 text-sm leading-6 text-peer-copySoft">
          <li>형식: {gatheringFormat}</li>
          <li>상태: {gatheringStatus}</li>
          <li>작성일: {formatDateTime(post.created_at)}</li>
          {#if post.updated_at && post.updated_at !== post.created_at}
            <li>수정일: {formatDateTime(post.updated_at)}</li>
          {/if}
        </ul>
      </section>
    </aside>
  </div>

  <section class="section-shell space-y-6" id="comment-composer">
    <header class="space-y-2">
      <div class="flex items-center gap-3">
        <div
          class="inline-flex h-11 w-11 items-center justify-center rounded-[18px] bg-peer-paperAlt text-peer-forest"
        >
          <MessageCircleMore class="h-5 w-5" />
        </div>
        <div>
          <p class="section-kicker">댓글과 대화</p>
          <h2 class="headline-balance text-3xl">댓글과 대화</h2>
        </div>
      </div>
      <p class="section-copy">
        참여 의사나 궁금한 점을 남기면, 다른 사람도 이 모임을 더 쉽게 이해할 수 있습니다.
      </p>
    </header>

    {#if loadError}
      <p
        class="rounded-[20px] border border-peer-danger/20 bg-peer-dangerSoft px-4 py-3 text-sm font-medium text-peer-danger"
        role="alert"
      >
        {loadError}
      </p>
    {/if}

    <form
      class="surface-panel-muted space-y-3"
      method="post"
      action="?/commentCreate"
      onsubmit={() => handleCommentCreateSubmit(null)}
    >
      <textarea
        name="content"
        rows={4}
        required
        placeholder="모임에 어떻게 참여하고 싶은지, 간단한 자기소개 등을 자유롭게 남겨주세요."
        bind:value={commentDraft}
        class="field-shell min-h-[140px]"
      ></textarea>
      {#if form?.intent === 'commentCreate' && !form?.parentCommentId && form.errors?.content}
        <p class="text-sm font-medium text-peer-danger">{form.errors.content}</p>
      {/if}
      {#if form?.intent === 'commentCreate' && !form?.parentCommentId && form.serverMessage}
        <p class="text-sm font-medium text-peer-danger">{form.serverMessage}</p>
      {/if}
      <button type="submit" class="btn btn-primary" disabled={topCommentSubmitting}>
        <span>{topCommentSubmitting ? '등록 중...' : '댓글 남기기'}</span>
      </button>
    </form>

    {#if comments.length === 0}
      <div class="empty-panel">
        <p class="font-semibold text-peer-ink">아직 댓글이 없습니다.</p>
        <p class="mt-2 text-sm">첫 번째 댓글로 이 모임의 대화를 시작해보세요.</p>
      </div>
    {:else}
      <ul class="space-y-4">
        {#each comments as comment}
          <li class="surface-panel space-y-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div class="flex items-start gap-3">
                <img
                  class="h-11 w-11 rounded-full border border-peer-stone bg-peer-paperAlt object-cover"
                  src={comment.author?.photo_url ?? '/images/default-profile.svg'}
                  alt={(comment.author?.full_name ?? '알 수 없는 멤버') + '의 프로필 이미지'}
                />
                <div>
                  <p class="text-sm font-semibold text-peer-ink">
                    {comment.author?.full_name ?? '알 수 없는 멤버'}
                  </p>
                  <p class="text-xs text-peer-copyMuted">{formatDateTime(comment.created_at)}</p>
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  class="btn btn-secondary px-3 py-2 text-xs"
                  onclick={() => {
                    if (replyingToCommentId !== comment.id) {
                      replyingToCommentId = comment.id;
                      replyDraft = '';
                    }
                  }}
                >
                  답글
                </button>
                {#if comment.author_id === session?.user.id}
                  <button
                    type="button"
                    class="btn btn-secondary px-3 py-2 text-xs"
                    onclick={() => {
                      editingCommentId = comment.id;
                      editingCommentContent = comment.content;
                    }}
                  >
                    수정
                  </button>
                  <form
                    method="post"
                    action="?/commentDelete"
                    onsubmit={() => handleCommentDeleteSubmit(comment.id)}
                  >
                    <input type="hidden" name="commentId" value={comment.id} />
                    <button
                      type="submit"
                      class="btn border border-peer-danger/20 bg-peer-dangerSoft px-3 py-2 text-xs text-peer-danger hover:bg-peer-dangerSoft"
                      disabled={commentDeleteSubmittingId === comment.id}
                    >
                      {commentDeleteSubmittingId === comment.id ? '삭제 중...' : '삭제'}
                    </button>
                  </form>
                {/if}
              </div>
            </div>

            {#if editingCommentId === comment.id}
              <form
                class="space-y-3"
                method="post"
                action="?/commentUpdate"
                onsubmit={() => handleCommentUpdateSubmit(comment.id)}
              >
                <input type="hidden" name="commentId" value={comment.id} />
                <textarea
                  name="content"
                  rows={4}
                  required
                  bind:value={editingCommentContent}
                  class="field-shell min-h-[120px]"
                ></textarea>
                {#if form?.intent === 'commentUpdate' && form.commentId === comment.id && form.errors?.content}
                  <p class="text-sm font-medium text-peer-danger">{form.errors.content}</p>
                {/if}
                {#if form?.intent === 'commentUpdate' && form.commentId === comment.id && form.serverMessage}
                  <p class="text-sm font-medium text-peer-danger">{form.serverMessage}</p>
                {/if}
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="btn btn-secondary px-4 py-2 text-xs"
                    onclick={() => {
                      editingCommentId = null;
                      editingCommentContent = '';
                    }}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    class="btn btn-primary px-4 py-2 text-xs"
                    disabled={commentUpdateSubmittingId === comment.id}
                  >
                    {commentUpdateSubmittingId === comment.id ? '저장 중...' : '저장'}
                  </button>
                </div>
              </form>
            {:else}
              <p class="whitespace-pre-wrap break-words text-sm leading-7 text-peer-copy">
                {comment.content}
              </p>
            {/if}

            {#if replyingToCommentId === comment.id}
              <form
                class="surface-panel-muted space-y-3"
                method="post"
                action="?/commentCreate"
                onsubmit={() => handleCommentCreateSubmit(comment.id)}
              >
                <input type="hidden" name="parentCommentId" value={comment.id} />
                <textarea
                  name="content"
                  rows={3}
                  required
                  bind:value={replyDraft}
                  placeholder="이 댓글에 대한 답글을 남겨보세요."
                  class="field-shell min-h-[110px]"
                ></textarea>
                {#if form?.intent === 'commentCreate' && form.parentCommentId === comment.id && form.errors?.content}
                  <p class="text-sm font-medium text-peer-danger">{form.errors.content}</p>
                {/if}
                {#if form?.intent === 'commentCreate' && form.parentCommentId === comment.id && form.serverMessage}
                  <p class="text-sm font-medium text-peer-danger">{form.serverMessage}</p>
                {/if}
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="btn btn-secondary px-4 py-2 text-xs"
                    onclick={() => {
                      replyingToCommentId = null;
                      replyDraft = '';
                    }}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    class="btn btn-primary px-4 py-2 text-xs"
                    disabled={replySubmittingForId === comment.id}
                  >
                    {replySubmittingForId === comment.id ? '등록 중...' : '답글 남기기'}
                  </button>
                </div>
              </form>
            {/if}

            {#if comment.replies.length > 0}
              <ul class="space-y-3 border-l border-peer-stone pl-4 sm:pl-6">
                {#each comment.replies as reply}
                  <li class="surface-panel-muted space-y-3">
                    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div class="flex items-start gap-3">
                        <img
                          class="h-9 w-9 rounded-full border border-peer-stone bg-white object-cover"
                          src={reply.author?.photo_url ?? '/images/default-profile.svg'}
                          alt={(reply.author?.full_name ?? '알 수 없는 멤버') + '의 프로필 이미지'}
                        />
                        <div>
                          <p class="text-xs font-semibold text-peer-ink">
                            {reply.author?.full_name ?? '알 수 없는 멤버'}
                          </p>
                          <p class="text-[11px] text-peer-copyMuted">
                            {formatDateTime(reply.created_at)}
                          </p>
                        </div>
                      </div>
                      {#if reply.author_id === session?.user.id}
                        <div class="flex items-center gap-2">
                          <button
                            type="button"
                            class="btn btn-secondary px-3 py-2 text-[11px]"
                            onclick={() => {
                              editingCommentId = reply.id;
                              editingCommentContent = reply.content;
                            }}
                          >
                            수정
                          </button>
                          <form
                            method="post"
                            action="?/commentDelete"
                            onsubmit={() => handleCommentDeleteSubmit(reply.id)}
                          >
                            <input type="hidden" name="commentId" value={reply.id} />
                            <button
                              type="submit"
                              class="btn border border-peer-danger/20 bg-peer-dangerSoft px-3 py-2 text-[11px] text-peer-danger hover:bg-peer-dangerSoft"
                              disabled={commentDeleteSubmittingId === reply.id}
                            >
                              {commentDeleteSubmittingId === reply.id ? '삭제 중...' : '삭제'}
                            </button>
                          </form>
                        </div>
                      {/if}
                    </div>

                    {#if editingCommentId === reply.id}
                      <form
                        class="space-y-3"
                        method="post"
                        action="?/commentUpdate"
                        onsubmit={() => handleCommentUpdateSubmit(reply.id)}
                      >
                        <input type="hidden" name="commentId" value={reply.id} />
                        <textarea
                          name="content"
                          rows={3}
                          required
                          bind:value={editingCommentContent}
                          class="field-shell min-h-[110px]"
                        ></textarea>
                        {#if form?.intent === 'commentUpdate' && form.commentId === reply.id && form.errors?.content}
                          <p class="text-sm font-medium text-peer-danger">{form.errors.content}</p>
                        {/if}
                        {#if form?.intent === 'commentUpdate' && form.commentId === reply.id && form.serverMessage}
                          <p class="text-sm font-medium text-peer-danger">{form.serverMessage}</p>
                        {/if}
                        <div class="flex items-center gap-2">
                          <button
                            type="button"
                            class="btn btn-secondary px-4 py-2 text-xs"
                            onclick={() => {
                              editingCommentId = null;
                              editingCommentContent = '';
                            }}
                          >
                            취소
                          </button>
                          <button
                            type="submit"
                            class="btn btn-primary px-4 py-2 text-xs"
                            disabled={commentUpdateSubmittingId === reply.id}
                          >
                            {commentUpdateSubmittingId === reply.id ? '저장 중...' : '저장'}
                          </button>
                        </div>
                      </form>
                    {:else}
                      <p class="whitespace-pre-wrap break-words text-sm leading-7 text-peer-copy">
                        {reply.content}
                      </p>
                    {/if}
                  </li>
                {/each}
              </ul>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</main>
