import type { ReferenceImportDistribution, ReferenceImportSummary } from './import-summary';

export const openFmriNBackParticipantsUrl =
	'https://s3.amazonaws.com/openneuro/ds000115/ds000115_R2.0.0/uncompressed/participants.tsv';
export const openFmriNBackParticipantsSha256 =
	'75364291e42c62851f8c1fe891742c74638476deae5767d1ce7a2d23ed2bdc08';

type ParticipantsRow = Record<string, string | undefined>;
export type OpenFmriNBackSummaryKey = 'all' | 'CON' | 'CON-SIB' | 'SCZ' | 'SCZ-SIB';

export type OpenFmriNBackSummaryTarget = {
	key: OpenFmriNBackSummaryKey;
	condition: string | null;
	outputPath: string;
	importId: string;
	datasetId: string;
	population: string;
	taskVariant: string;
	notes: string;
};

export const openFmriNBackSummaryTargets: OpenFmriNBackSummaryTarget[] = [
	{
		key: 'all',
		condition: null,
		outputPath: 'static/reference-data/n-back/openfmri-ds000115-summary.json',
		importId: 'openfmri-ds000115-nback-participants-r2-2026-04-29',
		datasetId: 'openfmri-ds000115-nback',
		population:
			'Schizophrenia, unaffected sibling, control sibling, and healthy control participants from ds000115.',
		taskVariant: 'Letter 2-back behavioural summary columns from participants.tsv.',
		notes:
			'Candidate imported summary from participants.tsv. Event files are not used because the dataset page warns against relying on them.'
	},
	{
		key: 'CON',
		condition: 'CON',
		outputPath: 'static/reference-data/n-back/openfmri-ds000115-summary-con.json',
		importId: 'openfmri-ds000115-nback-con-participants-r2-2026-04-29',
		datasetId: 'openfmri-ds000115-nback-con',
		population: 'Healthy control participants from ds000115 with condit=CON.',
		taskVariant:
			'Letter 2-back behavioural summary columns from participants.tsv filtered to condit=CON.',
		notes:
			'Candidate healthy-control subgroup summary from participants.tsv. Use only after construct and cohort mapping review.'
	},
	{
		key: 'CON-SIB',
		condition: 'CON-SIB',
		outputPath: 'static/reference-data/n-back/openfmri-ds000115-summary-con-sib.json',
		importId: 'openfmri-ds000115-nback-con-sib-participants-r2-2026-04-29',
		datasetId: 'openfmri-ds000115-nback-con-sib',
		population: 'Control sibling participants from ds000115 with condit=CON-SIB.',
		taskVariant:
			'Letter 2-back behavioural summary columns from participants.tsv filtered to condit=CON-SIB.',
		notes:
			'Candidate control-sibling subgroup summary from participants.tsv. Use only after construct and cohort mapping review.'
	},
	{
		key: 'SCZ',
		condition: 'SCZ',
		outputPath: 'static/reference-data/n-back/openfmri-ds000115-summary-scz.json',
		importId: 'openfmri-ds000115-nback-scz-participants-r2-2026-04-29',
		datasetId: 'openfmri-ds000115-nback-scz',
		population: 'Schizophrenia participants from ds000115 with condit=SCZ.',
		taskVariant:
			'Letter 2-back behavioural summary columns from participants.tsv filtered to condit=SCZ.',
		notes:
			'Candidate schizophrenia subgroup summary from participants.tsv. Use only after construct and cohort mapping review.'
	},
	{
		key: 'SCZ-SIB',
		condition: 'SCZ-SIB',
		outputPath: 'static/reference-data/n-back/openfmri-ds000115-summary-scz-sib.json',
		importId: 'openfmri-ds000115-nback-scz-sib-participants-r2-2026-04-29',
		datasetId: 'openfmri-ds000115-nback-scz-sib',
		population:
			'Unaffected sibling participants of schizophrenia probands from ds000115 with condit=SCZ-SIB.',
		taskVariant:
			'Letter 2-back behavioural summary columns from participants.tsv filtered to condit=SCZ-SIB.',
		notes:
			'Candidate schizophrenia-sibling subgroup summary from participants.tsv. Use only after construct and cohort mapping review.'
	}
];

type MetricStats = {
	sampleSize: number;
	mean: number;
	standardDeviation: number;
	minimum: number;
	maximum: number;
};

function parseParticipantsTsv(tsv: string): ParticipantsRow[] {
	const lines = tsv.trimEnd().split(/\r?\n/).filter(Boolean);
	const headers = lines[0]?.split('\t') ?? [];

	if (headers.length === 0) throw new Error('participants.tsv is missing a header row.');

	return lines.slice(1).map((line) => {
		const values = line.split('\t');
		return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
	});
}

function numericValue(row: ParticipantsRow, column: string): number | null {
	const value = row[column]?.trim();
	if (!value || value.toLowerCase() === 'n/a' || value.toLowerCase() === 'na') return null;

	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function targetForKey(key: OpenFmriNBackSummaryKey): OpenFmriNBackSummaryTarget {
	const target = openFmriNBackSummaryTargets.find((candidate) => candidate.key === key);
	if (!target) throw new Error(`Unknown OpenfMRI n-back summary key: ${key}`);
	return target;
}

function metricStats(values: number[]): MetricStats {
	if (values.length < 2) throw new Error('At least two metric values are required.');

	const sampleSize = values.length;
	const mean = values.reduce((total, value) => total + value, 0) / sampleSize;
	const standardDeviation = Math.sqrt(
		values.reduce((total, value) => total + (value - mean) ** 2, 0) / (sampleSize - 1)
	);

	return {
		sampleSize,
		mean,
		standardDeviation,
		minimum: Math.min(...values),
		maximum: Math.max(...values)
	};
}

function equalWidthDistribution(
	values: number[],
	binCount: number,
	notes: string
): ReferenceImportDistribution {
	const stats = metricStats(values);
	const width = (stats.maximum - stats.minimum) / binCount;

	if (!Number.isFinite(width) || width <= 0) {
		throw new Error('Distribution values must span a positive range.');
	}

	const counts = Array.from({ length: binCount }, () => 0);

	for (const value of values) {
		const index =
			value === stats.maximum
				? binCount - 1
				: Math.min(binCount - 1, Math.floor((value - stats.minimum) / width));
		counts[index] += 1;
	}

	return {
		source: 'participant_values',
		binning: 'equal_width',
		binCount,
		sampleSize: values.length,
		bins: counts.map((count, index) => ({
			index,
			xStart: stats.minimum + width * index,
			xEnd: index === binCount - 1 ? stats.maximum : stats.minimum + width * (index + 1),
			count,
			proportion: count / values.length
		})),
		notes
	};
}

export function createOpenFmriNBackSummary(
	participantsTsv: string,
	sourceSha256 = openFmriNBackParticipantsSha256,
	key: OpenFmriNBackSummaryKey = 'all'
): ReferenceImportSummary {
	const target = targetForKey(key);
	const allRows = parseParticipantsTsv(participantsTsv);
	const rows = target.condition
		? allRows.filter((row) => row.condit === target.condition)
		: allRows;
	const sourceColumnsPrefix = target.condition ? ['condit'] : [];

	if (rows.length === 0) {
		throw new Error(`No participants.tsv rows found for ${target.key}.`);
	}

	const accuracyValues = rows.flatMap((row) => {
		const nonTargetAccuracy = numericValue(row, 'nback2_nont');
		const targetAccuracy = numericValue(row, 'nback2_targ');

		return nonTargetAccuracy === null || targetAccuracy === null
			? []
			: [(nonTargetAccuracy + targetAccuracy) / 2];
	});
	const missingAccuracyRows = rows.length - accuracyValues.length;
	const dPrimeValuesWithMissing = rows.map((row) => numericValue(row, 'd4prime'));
	const dPrimeMissingRows = dPrimeValuesWithMissing.filter((value) => value === null).length;
	const dPrimeValues = dPrimeValuesWithMissing.flatMap((value) =>
		value === null || value > 10 ? [] : [value]
	);
	const dPrimeOutOfRangeRows =
		dPrimeValuesWithMissing.filter((value) => value !== null).length - dPrimeValues.length;
	const accuracyExcludedRows =
		missingAccuracyRows > 0
			? [
					{
						count: missingAccuracyRows,
						reason: 'Missing nback2_nont or nback2_targ.'
					}
				]
			: [];
	const dPrimeExcludedRows = [
		...(dPrimeMissingRows > 0
			? [
					{
						count: dPrimeMissingRows,
						reason: 'Missing d4prime value.'
					}
				]
			: []),
		...(dPrimeOutOfRangeRows > 0
			? [
					{
						count: dPrimeOutOfRangeRows,
						reason: 'Out-of-range d4prime value 866 for sub-03.'
					}
				]
			: [])
	];
	const accuracyStats = metricStats(accuracyValues);
	const dPrimeStats = metricStats(dPrimeValues);
	const dPrimeMethod = `${target.condition ? `Filtered to condit=${target.condition}. ` : ''}Summary of d4prime values in participants.tsv ${
		dPrimeOutOfRangeRows > 0
			? 'after removing missing values and one out-of-range row.'
			: 'after removing missing values.'
	}`;
	const dPrimeDistributionNotes =
		dPrimeOutOfRangeRows > 0
			? 'Equal-width bins computed from d4prime values in participants.tsv after excluding missing values and the out-of-range sub-03 value.'
			: 'Equal-width bins computed from d4prime values in participants.tsv after excluding missing values.';

	return {
		schemaVersion: 1,
		importId: target.importId,
		datasetId: target.datasetId,
		experimentSlug: 'n-back',
		source: {
			name: 'OpenfMRI ds000115 participants.tsv',
			url: openFmriNBackParticipantsUrl,
			datasetUrl: 'https://alpha.openfmri.org/dataset/ds000115/',
			revision: 'ds000115_R2.0.0',
			sha256: sourceSha256,
			license: 'PDDL',
			warning:
				'The OpenfMRI dataset page warns that event files may be inaccurate. This summary uses participants.tsv behavioural columns rather than event TSV reconstruction.'
		},
		extractor: {
			name: 'participants-tsv-summary',
			version: '2026-04-29',
			method:
				'Computed descriptive statistics from ds000115_R2.0.0 participants.tsv behavioural summary columns. No event-level files were parsed.'
		},
		review: {
			status: 'candidate',
			compatibility: 'partial',
			notes:
				'Imported candidate statistics. Validate task-level construct mapping before using for public cohort comparisons.'
		},
		dataset: {
			sampleSize: rows.length,
			population: target.population,
			taskVariant: target.taskVariant,
			notes: target.notes
		},
		metrics: [
			{
				metricKey: 'accuracy',
				label: 'Accuracy',
				unit: 'proportion',
				comparisonType: 'distribution',
				...accuracyStats,
				sourceColumns: [...sourceColumnsPrefix, 'nback2_nont', 'nback2_targ'],
				method: `${target.condition ? `Filtered to condit=${target.condition}. ` : ''}Subject-level 2-back accuracy is the unweighted mean of nback2_nont and nback2_targ because trial counts are not represented in participants.tsv.`,
				excludedRows: accuracyExcludedRows,
				distribution: equalWidthDistribution(
					accuracyValues,
					10,
					'Equal-width bins computed from subject-level 2-back accuracy values in participants.tsv.'
				),
				notes:
					'Candidate 2-back accuracy summary derived from participants.tsv target and non-target accuracy columns.'
			},
			{
				metricKey: 'sensitivityIndex',
				label: "Sensitivity d'",
				unit: 'count',
				comparisonType: 'distribution',
				...dPrimeStats,
				sourceColumns: [...sourceColumnsPrefix, 'd4prime'],
				method: dPrimeMethod,
				excludedRows: dPrimeExcludedRows,
				distribution: equalWidthDistribution(dPrimeValues, 10, dPrimeDistributionNotes),
				notes:
					"Candidate sensitivity summary from the source d4prime column; validate that d4prime aligns with Boundary's signal-detection definition before public comparisons."
			}
		]
	};
}

export function createOpenFmriNBackSummaries(
	participantsTsv: string,
	sourceSha256 = openFmriNBackParticipantsSha256
): { target: OpenFmriNBackSummaryTarget; summary: ReferenceImportSummary }[] {
	return openFmriNBackSummaryTargets.map((target) => ({
		target,
		summary: createOpenFmriNBackSummary(participantsTsv, sourceSha256, target.key)
	}));
}
