<script lang="ts">
    import Timer from '$lib/components/Timer.svelte';
</script>

<div class="flex flex-col gap-2">
    <Timer />
    <p class="text-xs font-mono">Current wealth: 1,000 points</p>
	<div class="border border-black p-1">
		<p class="font-mono text-xs">Income: 600 points, time penalty: 2 seconds</p>
		<button
			class="border border-b-8 border-r-8 border-black p-2 font-mono text-xs active:translate-x-0.5 active:translate-y-0.5"
			>Choose</button
		>
	</div>

	<div class="border border-black p-1">
		<p class="font-mono text-xs">Income: 600 points, time penalty: 2 seconds</p>
		<button
			class="border border-b-8 border-r-8 border-black p-2 font-mono text-xs active:translate-x-0.5 active:translate-y-0.5"
			>Choose</button
		>
	</div>
</div>
