<script lang="ts">
    import '../app.css';
    import { page } from '$app/stores';
    import { browser } from '$app/environment';
    import { fly, fade } from 'svelte/transition';
    import { cubicOut } from 'svelte/easing';
    import { tweened } from 'svelte/motion';

    let currentPage: string = '';

    $: if (browser) {
        currentPage = formatPathToTitle($page.url.pathname);
    }

    // Check if the current route is within the (experiments) group
    $: isExperimentPage = $page.url.pathname.split('/').some(segment => 
        ['n-armed-bandit', 'n-back', 'orientation-discrimination', 'ten-item-personality-inventory', 'intertemporal-choice']
        .includes(segment)
    );

    // Create a tweened store for the max-width
    const maxWidth = tweened(600, {
        duration: 300,
        easing: cubicOut
    });

    // Update the maxWidth whenever isExperimentPage changes
    $: {
        maxWidth.set(isExperimentPage ? 1200 : 600);
    }

    function goBack() {
        if (window.history.length <= 1) {
            window.location.href = '/';
        } else {
            window.history.back();
        }
    }

    function formatPathToTitle(path: string): string {
        const parts = path.replace(/^\//, '').split('-');
        return parts
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    }
</script>

<div class="relative mx-auto px-4" style="max-width: {$maxWidth}px">
    {#if $page.url.pathname === '/'}
        <div
            transition:fade={{ duration: 200 }}
            class="absolute inset-x-0 left-4 right-4 top-0 flex flex-row items-center justify-between text-sm"
        >
            <svg class="h-4 w-4 text-black" viewBox="0 0 100 100">
                <a href="/">
                    <circle cx="50" cy="50" r="40" fill="currentColor" />
                </a>
            </svg>
            <ul class="flew-row flex gap-x-2 underline">
                <li><a href="/about">about</a></li>
                <li><a href="https://buy.stripe.com/7sI17G4dQc1Q6yY7ss" target="_blank">donate</a></li>
                <li>
                    <a href="/sign-in" class="hidden text-blue-500 underline decoration-blue-500">sign in</a>
                </li>
            </ul>
        </div>
    {/if}
    <div class="sm:mt-24">
        <div class="my-4 h-[50px]">
            {#if $page.url.pathname != '/'}
                <div
                    class="flex flex-row items-center gap-2 font-mono text-xs"
                    in:fly={{ x: -10, duration: 200 }}
                    out:fly={{ x: -10, duration: 200 }}
                >
                    <button on:click={goBack} class="h-[24px] rounded-sm bg-gray-100 px-2 py-1">
                        &#x2190; Go back
                    </button>
                    <p class="text-gray-400">›</p>
                    <button class="h-[24px] max-w-[200px] truncate rounded-sm py-1">{currentPage}</button>
                </div>
            {/if}
        </div>
    </div>
    <slot></slot>
</div>

<style>
    /* Any additional styles */
</style>