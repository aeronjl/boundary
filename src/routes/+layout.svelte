<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { fly, fade } from 'svelte/transition';

	let currentPage: string = '';

	$: if (browser) {
		currentPage = formatPathToTitle($page.url.pathname);
	}

	function goBack() {
		if (window.history.length <= 1) {
			window.location.href = resolve('/');
		} else {
			window.history.back();
		}
	}

	function formatPathToTitle(path: string): string {
		// Remove the leading slash if present and then split the string by hyphens
		const parts = path.replace(/^\//, '').split('-');

		// Capitalize each part and join them with a space
		const formattedTitle = parts
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join(' ');

		return formattedTitle;
	}
</script>

<div class="relative mx-auto max-w-[600px] px-4">
	{#if $page.url.pathname === '/'}
		<div
			transition:fade={{ duration: 200 }}
			class="absolute inset-x-0 top-0 right-4 left-4 flex flex-row items-center justify-between text-sm"
		>
			<a href={resolve('/')} aria-label="Boundary home" class="text-black">
				<svg class="h-4 w-4" viewBox="0 0 100 100" aria-hidden="true">
					<circle cx="50" cy="50" r="40" fill="currentColor" />
				</svg>
			</a>
			<ul class="flew-row flex gap-x-2 underline">
				<li><a href={resolve('/about')}>about</a></li>
				<li><a href={resolve('/privacy')}>privacy</a></li>
				<li><a href="https://buy.stripe.com/7sI17G4dQc1Q6yY7ss" target="_blank">donate</a></li>
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

<style></style>
