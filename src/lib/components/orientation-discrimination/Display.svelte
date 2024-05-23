<script lang="ts">
	import { onMount } from 'svelte';

	let angle = 0; // Angle in degrees

	// Function to randomize the angle
	function randomizeAngle() {
		angle = Math.floor(Math.random() * 360) - 180; // Random angle from -180 to 179
	}

	onMount(() => {
		randomizeAngle();
	});

	// Function to handle key presses
	function handleKeydown(event: KeyboardEvent) {
		if ((event.key === 'ArrowLeft' && angle < 0) || (event.key === 'ArrowRight' && angle > 0)) {
			console.log('Correct!');
			randomizeAngle(); // Randomize again upon correct answer
		} else {
			console.log('Incorrect. Try again.');
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="flex flex-col gap-y-6">
<div class="flex h-[400px] items-center justify-center">
	<svg class="h-20 w-20" viewBox="0 0 100 100" style="transform: rotate({angle}deg);">
		<pattern
			id="grating"
			patternUnits="userSpaceOnUse"
			width="10"
			height="10"
			patternTransform="rotate({angle})"
		>
			<line x1="0" y1="0" x2="10" y2="0" stroke="black" stroke-width="2" />
		</pattern>
		<rect width="100" height="100" fill="url(#grating)" />
	</svg>
</div>

<div class="mx-auto flex w-1/2 flex-row items-center justify-between">
	<button class="border border-b-8 border-r-8 border-black p-2 font-mono text-sm">Less than</button>
	<button class="border border-b-8 border-r-8 border-black p-2 font-mono text-sm">More than</button>
</div>
</div>
