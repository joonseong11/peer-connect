<script lang="ts">
  import { Users, Award, Calendar, BookOpen } from 'lucide-svelte';

  let { data } = $props();

  const statCards = [
    { label: '멤버', value: data.stats.members, icon: Users, color: 'bg-peer-forest' },
    { label: '추천서', value: data.stats.endorsements, icon: Award, color: 'bg-peer-amber' },
    { label: '모임', value: data.stats.gatherings, icon: Calendar, color: 'bg-peer-indigo' },
    { label: '블로그', value: data.stats.blogPosts, icon: BookOpen, color: 'bg-peer-navy' }
  ];
</script>

<div>
  <h2 class="text-2xl font-bold text-peer-ink mb-6">대시보드</h2>

  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {#each statCards as card}
      <div class="bg-white rounded-xl p-5 shadow-panel">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm text-peer-copySoft">{card.label}</span>
          <div class="{card.color} text-white p-2 rounded-lg">
            <card.icon size={18} />
          </div>
        </div>
        <p class="text-3xl font-bold text-peer-ink">{card.value}</p>
      </div>
    {/each}
  </div>
</div>
