import type { ExperimentInterpretation } from '$lib/experiments/interpretation';
import { getReferenceComparisonContext } from '$lib/server/reference-data/comparisons';
import {
	createStudyProfileInterpretation,
	type StudySynthesisReferenceComparison,
	type StudySynthesisTask
} from '$lib/studies/synthesis';

const referenceMatchedStudyTaskSlugs = new Set(['n-back']);

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function numericMetrics(value: unknown): Record<string, number | null> {
	if (!isRecord(value)) return {};

	const metrics: Record<string, number | null> = {};
	for (const [key, metric] of Object.entries(value)) {
		if (metric === null) {
			metrics[key] = null;
		} else if (typeof metric === 'number' && Number.isFinite(metric)) {
			metrics[key] = metric;
		}
	}

	return metrics;
}

async function referenceComparisonsForTask(
	task: StudySynthesisTask
): Promise<StudySynthesisReferenceComparison[]> {
	if (task.status !== 'completed' || !referenceMatchedStudyTaskSlugs.has(task.slug)) return [];

	const metrics = numericMetrics(task.resultSummary);
	if (Object.keys(metrics).length === 0) return [];

	const context = await getReferenceComparisonContext(task.slug, metrics);

	return context.comparisons.map((comparison) => ({
		...comparison,
		taskName: task.name,
		taskSlug: task.slug
	}));
}

export async function createStudyProfileInterpretationWithReferenceData(
	tasks: StudySynthesisTask[]
): Promise<ExperimentInterpretation | null> {
	const referenceComparisons = (
		await Promise.all(tasks.map((task) => referenceComparisonsForTask(task)))
	).flat();

	return createStudyProfileInterpretation(tasks, { referenceComparisons });
}
