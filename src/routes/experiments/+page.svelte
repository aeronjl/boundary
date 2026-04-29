<script lang="ts">
	import { resolve } from '$app/paths';
	import { flip } from 'svelte/animate';
	import { fly } from 'svelte/transition';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { experimentCatalog } from '$lib/experiments/catalog';
</script>

<div in:fly={{ x: -10 }}>
	<PageHeader title="Experiments" />

	<div class="grid grid-cols-2 gap-4 font-mono text-sm md:grid-cols-3">
		{#each experimentCatalog as experiment (experiment.path)}
			<div animate:flip class="h-[200px] border p-2 shadow-md transition-all hover:border-black">
				<a href={resolve(experiment.path)} class="block h-full w-full">
					<p class="text-xs">{experiment.name}</p>
					<p class="mt-2 text-[0.7rem] text-gray-500">{experiment.taskType}</p>
					<p class="mt-1 text-[0.7rem] text-gray-500">{experiment.estimatedDuration}</p>
					<p class="mt-1 text-[0.7rem] text-gray-500">Status: {experiment.readiness}</p>
				</a>
			</div>
		{/each}
	</div>
</div>
