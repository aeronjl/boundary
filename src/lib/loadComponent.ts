// src/lib/loadComponent.ts
import type { SvelteComponent } from 'svelte';

const componentMap = import.meta.glob('/src/lib/components/**/LiteratureReview.svelte');
const resultsMap = import.meta.glob('/src/lib/components/**/Results.svelte');

export async function loadComponents(path: string) {
    const components: { LiteratureReview: SvelteComponent | null; Results: SvelteComponent | null } = {
        LiteratureReview: null,
        Results: null
    };

    const literatureReviewPath = `/src/lib/components${path}/LiteratureReview.svelte`;
    const resultsPath = `/src/lib/components${path}/Results.svelte`;

    try {
        if (componentMap[literatureReviewPath]) {
            const module = await componentMap[literatureReviewPath]() as { default: SvelteComponent };
            components.LiteratureReview = module.default;
        }
    } catch (error) {
        console.error(`Failed to load LiteratureReview component for path ${path}:`, error);
    }

    try {
        if (resultsMap[resultsPath]) {
            const module = await resultsMap[resultsPath]() as { default: SvelteComponent };
            components.Results = module.default;
        }
    } catch (error) {
        console.error(`Failed to load Results component for path ${path}:`, error);
    }

    return components;
}