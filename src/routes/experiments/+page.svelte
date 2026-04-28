<script lang="ts">
	import { resolve } from '$app/paths';
	import { flip } from 'svelte/animate';
	import { fly } from 'svelte/transition';
	import PageHeader from '$lib/components/PageHeader.svelte';

	const experiments = [
		{
			path: '/orientation-discrimination',
			name: 'Orientation discrimination'
		},
		{
			path: '/intertemporal-choice',
			name: 'Intertemporal choice'
		},
		{ path: '/n-back', name: 'n-back' },
		{ path: '/n-armed-bandit', name: 'n-armed bandit' },
		{
			path: '/ten-item-personality-inventory',
			name: 'Ten Item Personality Inventory'
		}
	] as const;
</script>

<div in:fly={{ x: -10 }}>
	<PageHeader title="Experiments" />

	<div class="grid grid-cols-2 gap-4 font-mono text-sm md:grid-cols-3">
		{#each experiments as experiment (experiment.path)}
			<div animate:flip class="h-[200px] border p-2 shadow-md transition-all hover:border-black">
				<a href={resolve(experiment.path)} class="block h-full w-full">
					<p class="text-xs">{experiment.name}</p>
				</a>
			</div>
		{/each}
	</div>
</div>
