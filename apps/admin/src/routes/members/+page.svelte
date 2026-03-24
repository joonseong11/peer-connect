<script lang="ts">
  import { Users, Shield, ShieldOff } from 'lucide-svelte';

  let { data } = $props();

  const totalPages = Math.ceil(data.totalCount / data.perPage);
</script>

<div>
  <div class="flex items-center justify-between mb-6">
    <h2 class="text-2xl font-bold text-peer-ink">멤버 관리</h2>
    <span class="text-sm text-peer-copySoft">총 {data.totalCount}명</span>
  </div>

  <div class="bg-white rounded-xl shadow-panel overflow-hidden">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-peer-stone text-left">
          <th class="px-4 py-3 font-medium text-peer-copySoft">이름</th>
          <th class="px-4 py-3 font-medium text-peer-copySoft">역할</th>
          <th class="px-4 py-3 font-medium text-peer-copySoft">이메일</th>
          <th class="px-4 py-3 font-medium text-peer-copySoft">가입일</th>
          <th class="px-4 py-3 font-medium text-peer-copySoft">관리자</th>
          <th class="px-4 py-3 font-medium text-peer-copySoft">관리</th>
        </tr>
      </thead>
      <tbody>
        {#each data.members as member}
          <tr class="border-b border-peer-stone/50 hover:bg-peer-paperAlt/50">
            <td class="px-4 py-3 font-medium text-peer-ink">{member.full_name ?? '—'}</td>
            <td class="px-4 py-3 text-peer-copySoft">{member.role ?? '—'}</td>
            <td class="px-4 py-3 text-peer-copySoft">{member.email ?? '—'}</td>
            <td class="px-4 py-3 text-peer-copySoft">
              {member.created_at ? new Date(member.created_at).toLocaleDateString('ko-KR') : '—'}
            </td>
            <td class="px-4 py-3">
              {#if member.is_admin}
                <span
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-peer-forestSoft text-peer-forest font-medium"
                >
                  <Shield size={12} /> 관리자
                </span>
              {:else}
                <span class="text-peer-copyMuted text-xs">일반</span>
              {/if}
            </td>
            <td class="px-4 py-3">
              <form method="POST" action="?/toggleAdmin">
                <input type="hidden" name="userId" value={member.user_id} />
                <input type="hidden" name="isAdmin" value={String(member.is_admin)} />
                <button
                  type="submit"
                  class="text-xs px-2 py-1 rounded border border-peer-stone hover:bg-peer-paperAlt transition-colors"
                >
                  {#if member.is_admin}
                    <span class="flex items-center gap-1"><ShieldOff size={12} /> 해제</span>
                  {:else}
                    <span class="flex items-center gap-1"><Shield size={12} /> 부여</span>
                  {/if}
                </button>
              </form>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  {#if totalPages > 1}
    <div class="flex justify-center gap-2 mt-6">
      {#each Array.from({ length: totalPages }, (_, i) => i + 1) as p}
        <a
          href="?page={p}"
          class="px-3 py-1 rounded text-sm {p === data.page
            ? 'bg-peer-forest text-white'
            : 'bg-white text-peer-copySoft border border-peer-stone hover:bg-peer-paperAlt'}"
        >
          {p}
        </a>
      {/each}
    </div>
  {/if}
</div>
