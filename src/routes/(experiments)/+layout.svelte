<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { slide } from 'svelte/transition';

	let showResults: boolean = false;
	let showLiteratureReview: boolean = false;
	let currentPath: string;

	$: if (browser) {
		currentPath = $page.url.pathname;
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

	{#await import(`/src/lib/components${currentPath}/LiteratureReview.svelte`) then LiteratureReview}
		<div class="my-4 flex flex-col gap-y-2 text-sm">
			<button on:click={toggleLiteratureReview} class="text-left font-serif text-base">
				Literature Review
			</button>
			{#if showLiteratureReview}
				<div transition:slide={{ axis: 'y', duration: 200 }}>
					<LiteratureReview.default />
				</div>
			{/if}
			<hr />
		</div>
	{/await}
</div>
