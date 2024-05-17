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

<div class="h-[400px] items-center justify-center flex">
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

<p>Press Left if angle is less than 0 degrees. Press Right if angle is more than 0 degrees.</p>
