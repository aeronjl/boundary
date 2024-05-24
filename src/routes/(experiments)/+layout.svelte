<script context="module" lang="ts">
	import type { LoadEvent } from '@sveltejs/kit';

	export async function load({ url }: LoadEvent) {
		return { path: url.pathname };
	}
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { get } from 'svelte/store';
	import { browser } from '$app/environment';
	import { slide } from 'svelte/transition';

	let showResults: boolean = false;
	let showLiteratureReview: boolean = false;
	let currentPath: string;

	let LiteratureReview: any = null;

	// Reactive statement to watch for changes in the page store
	$: {
		if (browser) {
			const currentPath = get(page).url.pathname;
			importComponent(currentPath);
		}
	}

	async function importComponent(path: string) {
		try {
			LiteratureReview = (await import(`/src/lib/components${path}/LiteratureReview.svelte`))
				.default;
		} catch (error) {
			console.error('Failed to load component:', error);
			LiteratureReview = null;
		}
	}

	function toggleLiteratureReview() {
		showLiteratureReview = !showLiteratureReview;
	}

	function toggleResults() {
		showResults = !showResults;
	}

	onMount(() => {});
</script>

<div>
	<div class="h-[500px]">
		<slot></slot>
	</div>

	<!--
	{#await import(`/src/lib/components${currentPath}/Results.svelte`) then Results}
		<div class="my-4 flex flex-col gap-y-2 text-sm">
			<button on:click={toggleResults} class="text-left font-serif text-base">Results</button>
			{#if showResults}
				<div transition:slide={{ axis: 'y', duration: 200 }}>
					<Results.default />
				</div>
			{/if}
			<hr />
		</div>
	{/await}
	-->

	{#if LiteratureReview}
		<div class="my-4 flex flex-col gap-y-2 text-sm">
			<button on:click={toggleLiteratureReview} class="text-left font-serif text-base">
				Literature Review
			</button>
			{#if showLiteratureReview}
				<div transition:slide={{ axis: 'y', duration: 200 }}>
					<svelte:component this={LiteratureReview} />
				</div>
			{/if}
			<hr />
		</div>
	{/if}
	
</div>
