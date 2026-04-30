export type ReferenceReadinessDataset = {
	status: string;
	compatibility: string;
};

export type ReferenceReadinessMetric = {
	mean: number | null;
	standardDeviation: number | null;
};

export type ReferenceReadinessMapping = {
	extractionStatus: string;
	sourceMetric: string;
	sourceColumns: string[];
	transformation: string;
	notes: string;
} | null;

export type ReferenceComparisonReadinessInput = {
	dataset: ReferenceReadinessDataset;
	metric: ReferenceReadinessMetric;
	mapping: ReferenceReadinessMapping;
};

const comparableDatasetCompatibilities = new Set(['compatible', 'partial']);

export function hasComparableReferenceDataset(dataset: ReferenceReadinessDataset): boolean {
	return (
		dataset.status === 'validated' && comparableDatasetCompatibilities.has(dataset.compatibility)
	);
}

export function hasUsableReferenceStats(metric: ReferenceReadinessMetric): boolean {
	return (
		metric.mean !== null &&
		Number.isFinite(metric.mean) &&
		metric.standardDeviation !== null &&
		Number.isFinite(metric.standardDeviation) &&
		metric.standardDeviation > 0
	);
}

export function hasReviewedReferenceMapping(mapping: ReferenceReadinessMapping): boolean {
	return (
		mapping?.extractionStatus === 'reviewed' &&
		mapping.sourceMetric.trim().length > 0 &&
		mapping.sourceColumns.length > 0 &&
		mapping.transformation.trim().length > 0 &&
		mapping.notes.trim().length > 0
	);
}

export function referenceComparisonBlockers({
	dataset,
	metric,
	mapping
}: ReferenceComparisonReadinessInput): string[] {
	const blockers: string[] = [];

	if (dataset.status !== 'validated') {
		blockers.push(`Dataset is ${dataset.status}.`);
	}

	if (!comparableDatasetCompatibilities.has(dataset.compatibility)) {
		blockers.push(`Compatibility is ${dataset.compatibility}.`);
	}

	if (!hasUsableReferenceStats(metric)) {
		blockers.push('Mean and positive SD are required.');
	}

	if (!mapping) {
		blockers.push('Mapping is missing.');
		return blockers;
	}

	if (mapping.extractionStatus !== 'reviewed') {
		blockers.push(`Mapping is ${mapping.extractionStatus}.`);
	}

	if (mapping.sourceMetric.trim().length === 0) {
		blockers.push('Source metric is missing.');
	}

	if (mapping.sourceColumns.length === 0) {
		blockers.push('Source columns are missing.');
	}

	if (mapping.transformation.trim().length === 0) {
		blockers.push('Transformation is missing.');
	}

	if (mapping.notes.trim().length === 0) {
		blockers.push('Mapping review note is missing.');
	}

	return blockers;
}

export function isReferenceComparisonReady(input: ReferenceComparisonReadinessInput): boolean {
	return referenceComparisonBlockers(input).length === 0;
}
