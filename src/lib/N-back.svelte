<script lang="ts">
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';

	const gridSize = 5;
	let squares = Array(gridSize * gridSize).fill(false);
	const sequence = writable<number[]>([]);
	const userSequence = writable<number[]>([]);
	let sequenceLength = 3; // You can adjust 'n' as needed

	function generateSequence() {
		sequence.set([]);
		userSequence.set([]);
		let newSequence = [];
		for (let i = 0; i < sequenceLength; i++) {
			newSequence.push(Math.floor(Math.random() * squares.length));
		}
		sequence.set(newSequence);
		flashSequence(newSequence);
	}

	async function flashSequence(seq: number[]) {
		for (let index of seq) {
			squares[index] = true;
			await new Promise((r) => setTimeout(r, 500)); // Flash time
			squares[index] = false;
			await new Promise((r) => setTimeout(r, 200)); // Time between flashes
		}
	}

	function selectSquare(index: number) {
		userSequence.update((n) => [...n, index]);
		$userSequence.forEach((val, idx) => {
			if (val !== $sequence[idx]) {
				console.error('Wrong sequence!');
				generateSequence(); // Reset if wrong
				return;
			}
			if (idx + 1 === sequenceLength) {
				console.log('Correct sequence!');
				sequenceLength++; // Increase difficulty
				generateSequence(); // Generate new sequence
			}
		});
	}

	onMount(() => {
		generateSequence();
	});
</script>

<div class="grid">
	{#each squares as square, index}
		<div
			class="square {square ? 'active' : ''} cursor-pointer"
			on:click={() => selectSquare(index)}
		></div>
	{/each}
</div>

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(5, 2rem);
		gap: 0.5rem;
	}
	.square {
		width: 2rem;
		height: 2rem;
		background-color: #ccc;
		transition: background-color 0.3s;
	}
	.active {
		background-color: blue; /* Active color when flashing */
	}
</style>
