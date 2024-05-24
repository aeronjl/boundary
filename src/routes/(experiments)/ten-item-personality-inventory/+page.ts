// src/routes/ten-item-personality-inventory/+page.ts
import type { LoadEvent } from '@sveltejs/kit';

export async function load({ fetch }: LoadEvent) {
	const response = await fetch('/experiments/ten-item-personality-inventory/questions.json');
	const questions = await response.json();

	return {
		questions
	};
}
