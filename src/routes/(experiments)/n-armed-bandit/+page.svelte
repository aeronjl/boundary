<script lang="ts">
	import { fade, slide } from 'svelte/transition';

	import LiteratureReview from '$lib/components/n-armed-bandit/LiteratureReview.svelte';
	import Results from '$lib/components/n-armed-bandit/Results.svelte';

	let showResults: boolean = false;
	let showLiteratureReview: boolean = false;

	function toggleResults() {
        showResults = !showResults;
    }

	function toggleLiteratureReview() {
        showLiteratureReview = !showLiteratureReview;
    }
</script>

<div class="gap-12 md:grid md:grid-cols-2">
	<div>
		<p class="font-mono text-xs">Current score: 0</p>

		<div>
			<div class="flex flex-row gap-12 py-12">
				<button class="rod"></button>
				<button class="rod"></button>
			</div>

			<button class="w-[100px] border border-b-8 border-r-8 border-black font-mono text-sm"
				>A</button
			>
			<button class="w-[100px] border border-b-8 border-r-8 border-black font-mono text-sm"
				>B</button
			>
		</div>

		<form class="my-12 flex flex-col gap-y-2 text-xs">
			<p class="font-mono font-bold">Options</p>
			<label class="font-mono" for=""><span class="italic">n</span>-arms</label>
			<select id="" name="" class="w-[50px] border">
				<option value="">2</option>
				<option value="">3</option>
				<option value="">4</option>
			</select>
		</form>
	</div>
	<div in:fade={{duration: 200}}>
		<div class="my-4 flex flex-col gap-y-2 text-sm">
			<button on:click={toggleResults} class="text-left font-serif text-base">Results</button>
			{#if showResults}
                    <div transition:slide={{ axis: 'y', duration: 200 }}>
                        <Results />
                    </div>
                {/if}
				<hr />
		</div>
			<button on:click={toggleLiteratureReview} class="text-left font-serif text-base">Literature Review</button>
			{#if showLiteratureReview}
					<div transition:slide={{ axis: 'y', duration: 200 }}>
						<LiteratureReview />
					</div>
				{/if}
				<hr />
	</div>
</div>

<style>
	.rod {
		z-index: 1;
		top: 30vmin;
		left: calc(50% - 2.5vmin);
		border-radius: 5vmin/2.5vmin;
		width: 5vmin;
		height: 10vmin;
		background: radial-gradient(
				2.5vmin 1.25vmin ellipse at 50% 1.25vmin,
				green 95%,
				transparent 100%,
				transparent
			),
			linear-gradient(to right, green, #6f6, green);
	}
</style>
