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
}  */

export async function loadComponent(path: string) {
	try {
		// Construct the dynamic import path
		const componentPath = `./components${path}/LiteratureReview.svelte`;

		// Use a dynamic import with a template literal
		return (await import(/* @vite-ignore */ componentPath)).default;
	} catch (error) {
		console.error(`Failed to load component for path ${path}:`, error);
		return null;
	}
}
