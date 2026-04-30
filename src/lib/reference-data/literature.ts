import {
	getLiteratureExtractionCsvFor,
	getLiteratureExtractionExportFor,
	literatureClaimReviewQueueFrom,
	literatureExtractionsForExperimentFrom,
	literatureMetricSummariesForExperimentFrom,
	participantLiteratureClaimsForExperimentFrom,
	parseLiteratureExtraction,
	summarizeLiteratureExtractions,
	validateLiteratureExtractions,
	type StructuredLiteratureExtraction
} from './literature-schema';

export type {
	LiteratureClaimParticipantExposure,
	LiteratureClaimReviewQueueItem,
	LiteratureClaimReviewState,
	LiteratureComparisonClaim,
	LiteratureComparisonClaimStatus,
	LiteratureExtractionStatus,
	LiteratureExtractionSummary,
	LiteratureExtractionValidationIssue,
	LiteratureMeasure,
	LiteratureMetricSummary,
	LiteratureParticipantUse,
	LiteratureResult,
	LiteratureResultType,
	LiteratureSample,
	LiteratureSource,
	LiteratureStudy,
	LiteratureTask,
	ParticipantLiteratureClaim,
	StructuredLiteratureExtraction
} from './literature-schema';

const extractionFiles = import.meta.glob<unknown>(
	'../../../static/reference-data/literature/*.json',
	{
		eager: true,
		import: 'default'
	}
);

export const literatureExtractionFilePaths = Object.keys(extractionFiles).sort();

export const literatureExtractions: StructuredLiteratureExtraction[] =
	literatureExtractionFilePaths.map((path) =>
		parseLiteratureExtraction(extractionFiles[path], path)
	);

export const literatureExtractionSummary = summarizeLiteratureExtractions(literatureExtractions);
export const literatureExtractionValidations = validateLiteratureExtractions(literatureExtractions);

export function literatureExtractionsForExperiment(
	experimentSlug: string
): StructuredLiteratureExtraction[] {
	return literatureExtractionsForExperimentFrom(literatureExtractions, experimentSlug);
}

export function literatureMetricSummariesForExperiment(experimentSlug: string) {
	return literatureMetricSummariesForExperimentFrom(literatureExtractions, experimentSlug);
}

export function participantLiteratureClaimsForExperiment(experimentSlug: string) {
	return participantLiteratureClaimsForExperimentFrom(literatureExtractions, experimentSlug);
}

export function literatureClaimReviewQueue() {
	return literatureClaimReviewQueueFrom(literatureExtractions);
}

export function getLiteratureExtractionExport() {
	return getLiteratureExtractionExportFor(literatureExtractions);
}

export function getLiteratureExtractionCsv(): string {
	return getLiteratureExtractionCsvFor(literatureExtractions);
}
