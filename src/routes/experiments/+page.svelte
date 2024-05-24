<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fly } from 'svelte/transition';

	let experiments = [
		{ path: 'orientation-discrimination', name: 'Orientation discrimination' },
		{ path: 'intertemporal-choice', name: 'Intertemporal choice' },
		{ path: 'n-back', name: 'n-back' },
		{ path: 'n-armed-bandit', name: 'n-armed bandit' },
		{ path: 'ten-item-personality-inventory', name: 'Ten Item Personality Inventory' }
	];
</script>

<div in:fly={{ x: -10 }}>
	<h1 class="mb-4 font-serif text-3xl leading-10">Experiments</h1>

	<div class="grid grid-cols-3 gap-2 font-mono text-sm">
		{#each experiments as experiment (experiment.path)}
			<div animate:flip class="h-[200px] border p-2 shadow-md transition-all hover:border-black">
				<a href="/{experiment.path}">
					<p class="text-xs">{experiment.name}</p>
				</a>
			</div>
		{/each}
	</div>
</div>
