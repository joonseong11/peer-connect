<script lang="ts">
  let { data } = $props();
</script>

<div>
  <div class="flex items-center justify-between mb-6">
    <h2 class="text-2xl font-bold text-peer-ink">모임 관리</h2>
    <span class="text-sm text-peer-copySoft">총 {data.totalCount}건</span>
  </div>

  <div class="bg-white rounded-xl shadow-panel overflow-hidden">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-peer-stone text-left">
          <th class="px-4 py-3 font-medium text-peer-copySoft">제목</th>
          <th class="px-4 py-3 font-medium text-peer-copySoft">주최자</th>
          <th class="px-4 py-3 font-medium text-peer-copySoft">일시</th>
          <th class="px-4 py-3 font-medium text-peer-copySoft">장소</th>
          <th class="px-4 py-3 font-medium text-peer-copySoft">생성일</th>
        </tr>
      </thead>
      <tbody>
        {#each data.gatherings as gathering}
          <tr class="border-b border-peer-stone/50 hover:bg-peer-paperAlt/50">
            <td class="px-4 py-3 font-medium text-peer-ink">{gathering.title ?? '—'}</td>
            <td class="px-4 py-3 text-peer-copySoft">{gathering.author?.full_name ?? '—'}</td>
            <td class="px-4 py-3 text-peer-copySoft">
              {gathering.date ? new Date(gathering.date).toLocaleDateString('ko-KR') : '—'}
            </td>
            <td class="px-4 py-3 text-peer-copySoft">{gathering.location ?? '—'}</td>
            <td class="px-4 py-3 text-peer-copySoft">
              {new Date(gathering.created_at).toLocaleDateString('ko-KR')}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
