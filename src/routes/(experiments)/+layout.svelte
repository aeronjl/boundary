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
    import { loadComponents } from '$lib/loadComponent';
    import { fade } from 'svelte/transition';
    import PageHeader from '$lib/components/PageHeader.svelte';
    let showResults: boolean = false;
    let showLiteratureReview: boolean = false;
    let pageTitle: string;

    let ComponentsPromise: Promise<any> | null = null;

    // Reactive statement to watch for changes in the page store
    $: {
        if (browser) {
            const currentPath = get(page).url.pathname;
            ComponentsPromise = importComponents(currentPath);
            pageTitle = formatPathToTitle(currentPath);
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

    function formatPathToTitle(path: string): string {
        const parts = path.replace(/^\//, '').split('-');
        return parts
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    }
</script>

<div>
    <div class="h-[500px]">
        <slot></slot>
    </div>

    {#await ComponentsPromise}
        <p>Loading components...</p>
    {:then components}
    <div in:fade={{duration: 200}}>
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
        <p>Error loading components: {error.message}</p>
    {/await}
</div>