<script lang="ts">
	import '../app.css';
	import AppHeader from '$lib/components/AppHeader.svelte';

	let { children, data } = $props();
</script>

<div class="flex min-h-screen flex-col">
	<AppHeader session={data?.session ?? null} />

	<div class="flex flex-1 flex-col px-5 py-6 sm:px-8">
		{@render children()}
	</div>

	<footer class="border-t border-slate-200/60 bg-white/90 backdrop-blur-xl">
		<div class="mx-auto max-w-5xl px-5 pb-7 pt-6 text-center sm:px-8">
			<p class="text-sm font-semibold text-slate-600">Peer Connect</p>
		</div>
	</footer>
</div>
