<script lang="ts">
  let { data } = $props();
</script>

<div>
  <div class="flex items-center justify-between mb-6">
    <h2 class="text-2xl font-bold text-peer-ink">추천서 관리</h2>
    <span class="text-sm text-peer-copySoft">총 {data.totalCount}건</span>
  </div>

  <div class="space-y-3">
    {#each data.endorsements as endorsement}
      <div class="bg-white rounded-xl shadow-panel p-5">
        <div class="flex items-center gap-2 text-sm text-peer-copySoft mb-2">
          <span class="font-medium text-peer-ink">{endorsement.author?.full_name ?? '—'}</span>
          <span>→</span>
          <span class="font-medium text-peer-ink">{endorsement.target?.full_name ?? '—'}</span>
          <span class="ml-auto">
            {new Date(endorsement.created_at).toLocaleDateString('ko-KR')}
          </span>
        </div>
        <p class="text-sm text-peer-copy leading-relaxed">
          {endorsement.content ?? '(내용 없음)'}
        </p>
      </div>
    {/each}
  </div>
</div>
