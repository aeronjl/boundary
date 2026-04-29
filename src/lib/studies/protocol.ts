import { getExperimentCatalogEntry, type ExperimentCatalogEntry } from '$lib/experiments/catalog';

export const boundaryStudyProtocolId = 'boundary-v1';

export const boundaryStudyTaskSlugs = [
	'orientation-discrimination',
	'intertemporal-choice',
	'n-back',
	'n-armed-bandit',
	'ten-item-personality-inventory'
] as const;

export type BoundaryStudyTaskSlug = (typeof boundaryStudyTaskSlugs)[number];

export type StudyProtocolTask = ExperimentCatalogEntry & {
	position: number;
};

export type StudyProtocol = {
	id: string;
	name: string;
	description: string;
	tasks: StudyProtocolTask[];
};

export const boundaryStudyProtocol: StudyProtocol = {
	id: boundaryStudyProtocolId,
	name: 'Boundary study',
	description:
		'A short protocol combining perception, memory, decision making, and self-report tasks.',
	tasks: boundaryStudyTaskSlugs.map((slug, index) => ({
		...getExperimentCatalogEntry(slug),
		position: index + 1
	}))
};

export function isBoundaryStudyTaskSlug(value: string): value is BoundaryStudyTaskSlug {
	return boundaryStudyTaskSlugs.includes(value as BoundaryStudyTaskSlug);
}
