import { redirect } from '@sveltejs/kit';
import { isAdminAuthenticated } from '$lib/server/admin/auth';
import { crossTaskRelationships } from '$lib/reference-data/relationships';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	if (!isAdminAuthenticated(cookies)) {
		throw redirect(303, '/admin');
	}

	const sourceTaskCount = new Set(
		crossTaskRelationships.map((relationship) => relationship.sourceExperimentSlug)
	).size;
	const targetTaskCount = new Set(
		crossTaskRelationships.map((relationship) => relationship.targetExperimentSlug)
	).size;
	const sourceCount = new Set(
		crossTaskRelationships.flatMap((relationship) =>
			relationship.sources.map((source) => source.evidenceId)
		)
	).size;

	return {
		relationships: crossTaskRelationships,
		sourceTaskCount,
		targetTaskCount,
		sourceCount
	};
};
