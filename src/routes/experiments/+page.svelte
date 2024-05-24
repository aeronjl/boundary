<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fly } from 'svelte/transition';
	import PageHeader from '$lib/components/PageHeader.svelte';

	let experiments = [
		{ path: 'orientation-discrimination', name: 'Orientation discrimination' },
		{ path: 'intertemporal-choice', name: 'Intertemporal choice' },
		{ path: 'n-back', name: 'n-back' },
		{ path: 'n-armed-bandit', name: 'n-armed bandit' },
		{ path: 'ten-item-personality-inventory', name: 'Ten Item Personality Inventory' }
	];
</script>

<div in:fly={{ x: -10 }}>
	<PageHeader title="Experiments" />

	<div class="grid md:grid-cols-3 grid-cols-2 gap-4 font-mono text-sm">
		{#each experiments as experiment (experiment.path)}
			<div animate:flip class="h-[200px] border p-2 shadow-md transition-all hover:border-black">
				<a href="/{experiment.path}" class="block w-full h-full">
					<p class="text-xs">{experiment.name}</p>
				</a>
			</div>
		{/each}
	</div>
</div>
