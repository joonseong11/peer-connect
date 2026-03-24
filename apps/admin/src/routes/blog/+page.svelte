<script lang="ts">
  import { ExternalLink } from 'lucide-svelte';

  let { data } = $props();
</script>

<div>
  <div class="flex items-center justify-between mb-6">
    <h2 class="text-2xl font-bold text-peer-ink">블로그 관리</h2>
    <span class="text-sm text-peer-copySoft">총 {data.totalCount}건</span>
  </div>

  <div class="bg-white rounded-xl shadow-panel overflow-hidden">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-peer-stone text-left">
          <th class="px-4 py-3 font-medium text-peer-copySoft">제목</th>
          <th class="px-4 py-3 font-medium text-peer-copySoft">작성자</th>
          <th class="px-4 py-3 font-medium text-peer-copySoft">게시일</th>
          <th class="px-4 py-3 font-medium text-peer-copySoft">수집일</th>
        </tr>
      </thead>
      <tbody>
        {#each data.posts as post}
          <tr class="border-b border-peer-stone/50 hover:bg-peer-paperAlt/50">
            <td class="px-4 py-3">
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                class="text-peer-forest hover:underline inline-flex items-center gap-1"
              >
                {post.title ?? '(제목 없음)'}
                <ExternalLink size={12} />
              </a>
            </td>
            <td class="px-4 py-3 text-peer-copySoft">{post.author?.full_name ?? '—'}</td>
            <td class="px-4 py-3 text-peer-copySoft">
              {post.published_at
                ? new Date(post.published_at).toLocaleDateString('ko-KR')
                : '—'}
            </td>
            <td class="px-4 py-3 text-peer-copySoft">
              {post.fetched_at ? new Date(post.fetched_at).toLocaleDateString('ko-KR') : '—'}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
