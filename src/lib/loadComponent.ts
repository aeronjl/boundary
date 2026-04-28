// src/lib/loadComponent.ts
import type { Component } from 'svelte';

export type ExperimentComponents = {
	LiteratureReview: Component | null;
	Results: Component | null;
};

const componentMap = import.meta.glob('/src/lib/components/**/LiteratureReview.svelte');
const resultsMap = import.meta.glob('/src/lib/components/**/Results.svelte');

export async function loadComponents(path: string): Promise<ExperimentComponents> {
	try {
		const literatureReviewPath = `/src/lib/components${path}/LiteratureReview.svelte`;
		const resultsPath = `/src/lib/components${path}/Results.svelte`;

		const LiteratureReview = componentMap[literatureReviewPath]
			? ((await (componentMap[literatureReviewPath]() as Promise<{ default: unknown }>))
					.default as Component)
			: null;
		const Results = resultsMap[resultsPath]
			? ((await (resultsMap[resultsPath]() as Promise<{ default: unknown }>)).default as Component)
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
