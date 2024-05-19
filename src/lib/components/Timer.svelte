<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { writable } from 'svelte/store';

	const initialTime = 50000; // milliseconds
	const time = writable(initialTime);
	let interval: number;

	onMount(() => {
		interval = setInterval(() => {
			time.update((n) => {
				if (n > 0) {
					return n - 10;
				} else {
					clearInterval(interval);
					return 0;
				}
			});
		}, 10);
	});

	onDestroy(() => {
		clearInterval(interval);
	});

	function reset() {
		time.set(initialTime);
		clearInterval(interval);
		interval = setInterval(() => {
			time.update((n) => {
				if (n > 0) {
					return n - 10;
				} else {
					clearInterval(interval);
					return 0;
				}
			});
		}, 10);
	}
</script>

<div class="border-black-400 w-full rounded-lg border">
	<div
		class="h-2 rounded-lg bg-black"
		style="width: {($time / initialTime) * 100}%"
	></div>
</div>
