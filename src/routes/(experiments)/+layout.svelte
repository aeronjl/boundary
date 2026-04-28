<script lang="ts">
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { slide } from 'svelte/transition';
	import { loadComponents } from '$lib/loadComponent';
	import { fade } from 'svelte/transition';

	let showResults: boolean = false;
	let showLiteratureReview: boolean = false;

	let ComponentsPromise: ReturnType<typeof loadComponents> = Promise.resolve({
		LiteratureReview: null,
		Results: null
	});

	// Reactive statement to watch for changes in the page store
	$: {
		if (browser) {
			const currentPath = $page.url.pathname;
			ComponentsPromise = importComponents(currentPath);
		}
	}

	async function importComponents(path: string) {
		return await loadComponents(path);
	}

	function toggleLiteratureReview() {
		showLiteratureReview = !showLiteratureReview;
	}

	function toggleResults() {
		showResults = !showResults;
	}
</script>

<div>
	<div class="h-[500px]">
		<slot></slot>
	</div>

	{#await ComponentsPromise}
		<p>Loading component...</p>
	{:then components}
		<div in:fade={{ duration: 200 }}>
			{#if components.Results}
				<div class="my-4 flex flex-col gap-y-2 text-sm">
					<button on:click={toggleResults} class="text-left font-serif text-base">Results</button>
					{#if showResults}
						<div transition:slide={{ axis: 'y', duration: 200 }}>
							<svelte:component this={components.Results} />
						</div>
					{/if}
					<hr />
				</div>
			{/if}
			{#if components.LiteratureReview}
				<div class="my-4 flex flex-col gap-y-2 text-sm">
					<button on:click={toggleLiteratureReview} class="text-left font-serif text-base">
						Literature Review
					</button>
					{#if showLiteratureReview}
						<div transition:slide={{ axis: 'y', duration: 200 }}>
							<svelte:component this={components.LiteratureReview} />
						</div>
					{/if}
					<hr />
				</div>
			{/if}
		</div>
	{:catch error}
		<p>Error loading component: {error.message}</p>
	{/await}
</div>
