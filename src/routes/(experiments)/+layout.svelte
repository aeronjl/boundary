<script lang="ts">
    import { page } from '$app/stores';
    import { slide } from 'svelte/transition';
    import { onMount } from 'svelte';
    import type { SvelteComponent } from 'svelte';
    import Literature from '$lib/components/ten-item-personality-inventory/Literature.svelte';

    let showResults: boolean = false;
    let showLiteratureReview: boolean = false;

    let currentExperiment: string
    let LiteratureComponent: typeof SvelteComponent | null = null;

    function toggleLiteratureReview() {
        showLiteratureReview = !showLiteratureReview;
    }

    function toggleResults() {
        showResults = !showResults;
    }
    
    currentExperiment = $page.url.pathname;

    const componentPath = `/src/lib/components${currentExperiment}/Literature.svelte`;

    onMount(async () => {
            LiteratureComponent = (await import (`${componentPath}`)).default;
    });

</script>
<slot></slot>

<div class="my-4 flex flex-col gap-y-2 text-sm">
    <button on:click={toggleResults} class="font-serif text-lg text-left">Results</button>
    {#if showResults}
    <div in:slide={{axis: 'y', duration: 500}} out:slide={{axis: 'y', duration: 200}} class="flex flex-col gap-y-2">
        <p class="my-2">Results are not yet available.</p>
        </div>
    {/if}
    <hr />
</div>

<div class="my-4 flex flex-col gap-y-2 text-sm">
	<button on:click={toggleLiteratureReview} class="font-serif text-lg text-left">Literature Review</button>
	{#if showLiteratureReview}
	<div in:slide={{axis: 'y', duration: 500}} out:slide={{axis: 'y', duration: 200}} class="flex flex-col gap-y-2">
        {#if LiteratureComponent}
        <svelte:component this={LiteratureComponent} />
        {/if}
    </div>
	{/if}
	<hr />
</div>