<script lang="ts">
  let { data } = $props();
</script>

<div>
  <div class="flex items-center justify-between mb-6">
    <h2 class="text-2xl font-bold text-peer-ink">초대 관리</h2>
    <span class="text-sm text-peer-copySoft">총 {data.totalCount}건</span>
  </div>

  <div class="bg-white rounded-xl shadow-panel overflow-hidden">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-peer-stone text-left">
          <th class="px-4 py-3 font-medium text-peer-copySoft">코드</th>
          <th class="px-4 py-3 font-medium text-peer-copySoft">초대자</th>
          <th class="px-4 py-3 font-medium text-peer-copySoft">생성일</th>
        </tr>
      </thead>
      <tbody>
        {#each data.invites as invite}
          <tr class="border-b border-peer-stone/50 hover:bg-peer-paperAlt/50">
            <td class="px-4 py-3 font-mono text-peer-ink">{invite.code}</td>
            <td class="px-4 py-3 text-peer-copySoft">
              {invite.inviter?.full_name ?? '—'}
            </td>
            <td class="px-4 py-3 text-peer-copySoft">
              {new Date(invite.created_at).toLocaleDateString('ko-KR')}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
