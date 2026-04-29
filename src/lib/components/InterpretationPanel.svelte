<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ExperimentInterpretation } from '$lib/experiments/interpretation';

	export let interpretation: ExperimentInterpretation;
	export let title = 'How this compares';
</script>

<div class="mt-6">
	<h3 class="font-serif text-xl">{title}</h3>
	<div class="mt-2 grid gap-3 border-t border-gray-200 pt-3 md:grid-cols-2">
		{#each interpretation.cards as card (card.title)}
			<section
				class="border-l-2 py-1 pl-3 {card.tone === 'strong'
					? 'border-green-500'
					: card.tone === 'watch'
						? 'border-amber-500'
						: 'border-gray-300'}"
			>
				<p class="text-xs text-gray-500">{card.title}</p>
				<p class="font-serif text-xl">{card.value}</p>
				<p class="mt-1 text-gray-600">{card.body}</p>
			</section>
		{/each}
	</div>
	<div class="mt-4 grid gap-3 md:grid-cols-2">
		{#each interpretation.relatedPrompts as prompt (prompt.href)}
			<a class="border-t border-gray-200 py-3" href={resolve(prompt.href)}>
				<span class="font-medium underline">{prompt.title}</span>
				<span class="mt-1 block text-gray-600">{prompt.body}</span>
			</a>
		{/each}
	</div>
	<p class="mt-4 max-w-2xl text-xs text-gray-500">{interpretation.disclaimer}</p>
	{#if interpretation.references.length > 0}
		<p class="mt-2 text-xs text-gray-500">
			Sources:
			{#each interpretation.references as reference, index (reference.id)}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a class="underline" href={reference.url} rel="noreferrer" target="_blank">
					{reference.shortCitation}</a
				>{index < interpretation.references.length - 1 ? ', ' : ''}
			{/each}
		</p>
	{/if}
</div>
