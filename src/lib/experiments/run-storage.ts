import { browser } from '$app/environment';

const keyPrefix = 'boundary:run:';

export function getStoredExperimentRunId(slug: string): string | null {
	if (!browser) return null;

	try {
		return localStorage.getItem(`${keyPrefix}${slug}`);
	} catch {
		return null;
	}
}

export function storeExperimentRunId(slug: string, runId: string): void {
	if (!browser) return;

	try {
		localStorage.setItem(`${keyPrefix}${slug}`, runId);
	} catch {
		// Storage is best-effort; experiments still work without resume.
	}
}

export function clearStoredExperimentRunId(slug: string): void {
	if (!browser) return;

	try {
		localStorage.removeItem(`${keyPrefix}${slug}`);
	} catch {
		// Storage is best-effort; experiments still work without resume.
	}
}
