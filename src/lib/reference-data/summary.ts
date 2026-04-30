import {
	referenceDatasetSeeds,
	referenceMetricContracts,
	referenceOutcomeTargetsForMetricContract,
	type ReferenceDatasetSeed,
	type ReferenceMetricContract,
	type ReferenceOutcomeTargetContract,
	type ReferenceMetricUnit
} from './catalog';

export type ReferenceMetricValue = number | null | undefined;

export type ReferenceContextMetric = ReferenceMetricContract & {
	currentValue: ReferenceMetricValue;
	hasCandidateDataset: boolean;
	hasValidatedDataset: boolean;
	outcomeTargets: ReferenceOutcomeTargetContract[];
};

export type ReferenceContextSummary = {
	experimentSlug: string;
	contracts: ReferenceMetricContract[];
	metrics: ReferenceContextMetric[];
	datasets: ReferenceDatasetSeed[];
	candidateDatasetCount: number;
	validatedDatasetCount: number;
	summary: string;
};

export function referenceContractsForExperiment(experimentSlug: string): ReferenceMetricContract[] {
	return referenceMetricContracts.filter((contract) => contract.experimentSlug === experimentSlug);
}

export function referenceDatasetsForExperiment(experimentSlug: string): ReferenceDatasetSeed[] {
	return referenceDatasetSeeds.filter((dataset) => dataset.experimentSlug === experimentSlug);
}

function metricHasDataset(dataset: ReferenceDatasetSeed, metricKey: string): boolean {
	return dataset.metrics.some((metric) => metric.metricKey === metricKey);
}

function createSummary(
	contracts: ReferenceMetricContract[],
	datasets: ReferenceDatasetSeed[],
	validatedDatasetCount: number
): string {
	if (validatedDatasetCount > 0) {
		return 'Validated reference data exists for at least one metric. Cohort comparison can be added once distribution statistics are imported.';
	}

	if (datasets.length > 0) {
		return 'Candidate reference data is registered, but Boundary will not show cohort similarity until compatibility and metric extraction are reviewed.';
	}

	if (contracts.length > 0) {
		return 'Comparable metrics are defined, but no external reference dataset is registered for this task yet.';
	}

	return 'No reference comparison contract is defined for this task yet.';
}

export function createReferenceContext(
	experimentSlug: string,
	currentMetrics: Record<string, ReferenceMetricValue> = {}
): ReferenceContextSummary {
	const contracts = referenceContractsForExperiment(experimentSlug);
	const datasets = referenceDatasetsForExperiment(experimentSlug);
	const candidateDatasetCount = datasets.filter((dataset) => dataset.status === 'candidate').length;
	const validatedDatasetCount = datasets.filter((dataset) => dataset.status === 'validated').length;
	const metrics = contracts.map((contract) => {
		const datasetsForMetric = datasets.filter((dataset) =>
			metricHasDataset(dataset, contract.metricKey)
		);

		return {
			...contract,
			currentValue: currentMetrics[contract.metricKey],
			hasCandidateDataset: datasetsForMetric.some((dataset) => dataset.status === 'candidate'),
			hasValidatedDataset: datasetsForMetric.some((dataset) => dataset.status === 'validated'),
			outcomeTargets: referenceOutcomeTargetsForMetricContract(contract)
		};
	});

	return {
		experimentSlug,
		contracts,
		metrics,
		datasets,
		candidateDatasetCount,
		validatedDatasetCount,
		summary: createSummary(contracts, datasets, validatedDatasetCount)
	};
}

export function formatReferenceValue(
	value: ReferenceMetricValue,
	unit: ReferenceMetricUnit
): string {
	if (value === null || value === undefined || !Number.isFinite(value)) return 'not available';

	if (unit === 'proportion') return `${(value * 100).toFixed(0)}%`;
	if (unit === 'milliseconds') return `${Math.round(value)} ms`;
	if (unit === 'seconds') return `${Math.round(value)} sec`;
	if (unit === 'degrees') return `${value.toFixed(1)} deg`;
	if (unit === 'points') return `${value.toFixed(0)} points`;

	return value.toFixed(2);
}
