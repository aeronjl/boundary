import {
	referenceCompatibilities,
	referenceDatasetStatuses,
	type ReferenceComparisonType,
	type ReferenceCompatibility,
	type ReferenceDatasetStatus,
	type ReferenceMetricUnit
} from './catalog';

export type ReferenceImportSource = {
	name: string;
	url: string;
	datasetUrl: string;
	revision: string;
	sha256: string;
	license: string;
	warning: string;
};

export type ReferenceImportExtractor = {
	name: string;
	version: string;
	method: string;
};

export type ReferenceImportReview = {
	status: ReferenceDatasetStatus;
	compatibility: ReferenceCompatibility;
	notes: string;
};

export type ReferenceImportDataset = {
	sampleSize: number;
	population: string;
	taskVariant: string;
	notes: string;
};

export type ReferenceImportExcludedRows = {
	count: number;
	reason: string;
};

export type ReferenceImportMetric = {
	metricKey: string;
	label: string;
	unit: ReferenceMetricUnit;
	comparisonType: ReferenceComparisonType;
	sampleSize: number;
	mean: number;
	standardDeviation: number;
	minimum: number;
	maximum: number;
	sourceColumns: string[];
	method: string;
	excludedRows: ReferenceImportExcludedRows[];
	notes: string;
};

export type ReferenceImportSummary = {
	schemaVersion: 1;
	importId: string;
	datasetId: string;
	experimentSlug: string;
	source: ReferenceImportSource;
	extractor: ReferenceImportExtractor;
	review: ReferenceImportReview;
	dataset: ReferenceImportDataset;
	metrics: ReferenceImportMetric[];
};

export type ReferenceImportDatasetMetadata = {
	referenceImport: {
		importId: string;
		importedAt: string;
		source: ReferenceImportSource;
		extractor: ReferenceImportExtractor;
		review: ReferenceImportReview;
	};
};

export type ReferenceImportMetricMetadata = {
	referenceImport: {
		importId: string;
		importedAt: string;
		source: Pick<ReferenceImportSource, 'name' | 'url' | 'revision' | 'sha256'>;
		extractor: ReferenceImportExtractor;
		sampleSize: number;
		sourceColumns: string[];
		method: string;
		excludedRows: ReferenceImportExcludedRows[];
	};
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredRecord(value: unknown, path: string): Record<string, unknown> {
	if (!isRecord(value)) throw new Error(`${path} must be an object.`);
	return value;
}

function requiredString(value: unknown, path: string): string {
	if (typeof value !== 'string' || value.trim() === '') {
		throw new Error(`${path} must be a non-empty string.`);
	}

	return value.trim();
}

function requiredNumber(value: unknown, path: string): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		throw new Error(`${path} must be a finite number.`);
	}

	return value;
}

function requiredInteger(value: unknown, path: string): number {
	const parsed = requiredNumber(value, path);
	if (!Number.isInteger(parsed) || parsed < 0) {
		throw new Error(`${path} must be a non-negative integer.`);
	}

	return parsed;
}

function requiredStringArray(value: unknown, path: string): string[] {
	if (!Array.isArray(value)) throw new Error(`${path} must be an array.`);

	return value.map((item, index) => requiredString(item, `${path}[${index}]`));
}

function parseExcludedRows(value: unknown, path: string): ReferenceImportExcludedRows[] {
	if (!Array.isArray(value)) throw new Error(`${path} must be an array.`);

	return value.map((item, index) => {
		const record = requiredRecord(item, `${path}[${index}]`);
		return {
			count: requiredInteger(record.count, `${path}[${index}].count`),
			reason: requiredString(record.reason, `${path}[${index}].reason`)
		};
	});
}

function parseReferenceMetricUnit(value: unknown, path: string): ReferenceMetricUnit {
	const unit = requiredString(value, path);
	const validUnits = ['proportion', 'milliseconds', 'seconds', 'points', 'degrees', 'count'];
	if (!validUnits.includes(unit)) throw new Error(`${path} must be a known metric unit.`);

	return unit as ReferenceMetricUnit;
}

function parseComparisonType(value: unknown, path: string): ReferenceComparisonType {
	const comparisonType = requiredString(value, path);
	const validTypes = ['distribution', 'threshold', 'descriptive'];
	if (!validTypes.includes(comparisonType)) {
		throw new Error(`${path} must be a known comparison type.`);
	}

	return comparisonType as ReferenceComparisonType;
}

function parseReviewStatus(value: unknown, path: string): ReferenceDatasetStatus {
	const status = requiredString(value, path);
	if (!referenceDatasetStatuses.includes(status as ReferenceDatasetStatus)) {
		throw new Error(`${path} must be a known dataset status.`);
	}

	return status as ReferenceDatasetStatus;
}

function parseCompatibility(value: unknown, path: string): ReferenceCompatibility {
	const compatibility = requiredString(value, path);
	if (!referenceCompatibilities.includes(compatibility as ReferenceCompatibility)) {
		throw new Error(`${path} must be a known compatibility value.`);
	}

	return compatibility as ReferenceCompatibility;
}

function parseSource(value: unknown): ReferenceImportSource {
	const source = requiredRecord(value, 'source');
	return {
		name: requiredString(source.name, 'source.name'),
		url: requiredString(source.url, 'source.url'),
		datasetUrl: requiredString(source.datasetUrl, 'source.datasetUrl'),
		revision: requiredString(source.revision, 'source.revision'),
		sha256: requiredString(source.sha256, 'source.sha256'),
		license: requiredString(source.license, 'source.license'),
		warning: requiredString(source.warning, 'source.warning')
	};
}

function parseExtractor(value: unknown): ReferenceImportExtractor {
	const extractor = requiredRecord(value, 'extractor');
	return {
		name: requiredString(extractor.name, 'extractor.name'),
		version: requiredString(extractor.version, 'extractor.version'),
		method: requiredString(extractor.method, 'extractor.method')
	};
}

function parseReview(value: unknown): ReferenceImportReview {
	const review = requiredRecord(value, 'review');
	return {
		status: parseReviewStatus(review.status, 'review.status'),
		compatibility: parseCompatibility(review.compatibility, 'review.compatibility'),
		notes: requiredString(review.notes, 'review.notes')
	};
}

function parseDataset(value: unknown): ReferenceImportDataset {
	const dataset = requiredRecord(value, 'dataset');
	return {
		sampleSize: requiredInteger(dataset.sampleSize, 'dataset.sampleSize'),
		population: requiredString(dataset.population, 'dataset.population'),
		taskVariant: requiredString(dataset.taskVariant, 'dataset.taskVariant'),
		notes: requiredString(dataset.notes, 'dataset.notes')
	};
}

function parseMetric(value: unknown, index: number): ReferenceImportMetric {
	const path = `metrics[${index}]`;
	const metric = requiredRecord(value, path);
	const standardDeviation = requiredNumber(metric.standardDeviation, `${path}.standardDeviation`);

	if (standardDeviation < 0) {
		throw new Error(`${path}.standardDeviation cannot be negative.`);
	}

	return {
		metricKey: requiredString(metric.metricKey, `${path}.metricKey`),
		label: requiredString(metric.label, `${path}.label`),
		unit: parseReferenceMetricUnit(metric.unit, `${path}.unit`),
		comparisonType: parseComparisonType(metric.comparisonType, `${path}.comparisonType`),
		sampleSize: requiredInteger(metric.sampleSize, `${path}.sampleSize`),
		mean: requiredNumber(metric.mean, `${path}.mean`),
		standardDeviation,
		minimum: requiredNumber(metric.minimum, `${path}.minimum`),
		maximum: requiredNumber(metric.maximum, `${path}.maximum`),
		sourceColumns: requiredStringArray(metric.sourceColumns, `${path}.sourceColumns`),
		method: requiredString(metric.method, `${path}.method`),
		excludedRows: parseExcludedRows(metric.excludedRows, `${path}.excludedRows`),
		notes: requiredString(metric.notes, `${path}.notes`)
	};
}

export function parseReferenceImportSummary(value: unknown): ReferenceImportSummary {
	const summary = requiredRecord(value, 'summary');
	if (summary.schemaVersion !== 1) throw new Error('schemaVersion must be 1.');
	if (!Array.isArray(summary.metrics)) throw new Error('metrics must be an array.');

	return {
		schemaVersion: 1,
		importId: requiredString(summary.importId, 'importId'),
		datasetId: requiredString(summary.datasetId, 'datasetId'),
		experimentSlug: requiredString(summary.experimentSlug, 'experimentSlug'),
		source: parseSource(summary.source),
		extractor: parseExtractor(summary.extractor),
		review: parseReview(summary.review),
		dataset: parseDataset(summary.dataset),
		metrics: summary.metrics.map(parseMetric)
	};
}

export function createDatasetImportMetadata(
	summary: ReferenceImportSummary,
	importedAt: string
): ReferenceImportDatasetMetadata {
	return {
		referenceImport: {
			importId: summary.importId,
			importedAt,
			source: summary.source,
			extractor: summary.extractor,
			review: summary.review
		}
	};
}

export function createMetricImportMetadata(
	summary: ReferenceImportSummary,
	metric: ReferenceImportMetric,
	importedAt: string
): ReferenceImportMetricMetadata {
	return {
		referenceImport: {
			importId: summary.importId,
			importedAt,
			source: {
				name: summary.source.name,
				url: summary.source.url,
				revision: summary.source.revision,
				sha256: summary.source.sha256
			},
			extractor: summary.extractor,
			sampleSize: metric.sampleSize,
			sourceColumns: metric.sourceColumns,
			method: metric.method,
			excludedRows: metric.excludedRows
		}
	};
}
