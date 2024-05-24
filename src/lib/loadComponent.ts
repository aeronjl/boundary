/** export async function loadComponent(path: string) {
	try {
		switch (path) {
			case '/orientation-discrimination':
				return (await import('./components/orientation-discrimination/LiteratureReview.svelte'))
					.default;
            case '/ten-item-personality-inventory':
                return (await import('./components/ten-item-personality-inventory/LiteratureReview.svelte'))
                    .default;
			default:
				throw new Error('Component not found');
		}
	} catch (error) {
		console.error(`Failed to load component for path ${path}:`, error);
		return null;
	}
}  

export async function loadComponent(path: string) {
	try {
		// Construct the dynamic import path
		const componentPath = `./components${path}/LiteratureReview.svelte`;

		// Use a dynamic import with a template literal
		return (await import( componentPath)).default;
	} catch (error) {
		console.error(`Failed to load component for path ${path}:`, error);
		return null;
	}
}

*/

// src/lib/loadComponent.ts
const componentMap = import.meta.glob('/src/lib/components/**/LiteratureReview.svelte');
const resultsMap = import.meta.glob('/src/lib/components/**/Results.svelte');

export async function loadComponents(path: string) {
	try {
		const literatureReviewPath = `/src/lib/components${path}/LiteratureReview.svelte`;
		const resultsPath = `/src/lib/components${path}/Results.svelte`;

		const LiteratureReview = componentMap[literatureReviewPath]
			? (await componentMap[literatureReviewPath]()).default
			: null;
		const Results = resultsMap[resultsPath] ? (await resultsMap[resultsPath]()).default : null;

		if (!LiteratureReview || !Results) {
			throw new Error('Component not found');
		}

		return { LiteratureReview, Results };
	} catch (error) {
		console.error(`Failed to load components for path ${path}:`, error);
		return { LiteratureReview: null, Results: null };
	}
}
