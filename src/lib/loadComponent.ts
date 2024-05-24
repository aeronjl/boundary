// src/lib/loadComponent.ts
import type { SvelteComponent } from 'svelte';

const componentMap = import.meta.glob('/src/lib/components/**/LiteratureReview.svelte');
const resultsMap = import.meta.glob('/src/lib/components/**/Results.svelte');

export async function loadComponents(path: string) {
	try {
		const literatureReviewPath = `/src/lib/components${path}/LiteratureReview.svelte`;
		const resultsPath = `/src/lib/components${path}/Results.svelte`;

		const LiteratureReview = componentMap[literatureReviewPath]
			? ((await (componentMap[literatureReviewPath]() as Promise<{ default: unknown }>))
					.default as SvelteComponent)
			: null;
		const Results = resultsMap[resultsPath]
			? ((await (resultsMap[resultsPath]() as Promise<{ default: unknown }>))
					.default as SvelteComponent)
			: null;

		if (!LiteratureReview || !Results) {
			throw new Error('Component not found');
		}

		return { LiteratureReview, Results };
	} catch (error) {
		console.error(`Failed to load components for path ${path}:`, error);
		return { LiteratureReview: null, Results: null };
	}
}
