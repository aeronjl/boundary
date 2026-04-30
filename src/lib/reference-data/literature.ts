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
	type LiteratureClaimPromotionContext,
	type StructuredLiteratureExtraction
} from './literature-schema';

export type {
	LiteratureClaimParticipantExposure,
	LiteratureClaimPromotionContext,
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

export function participantLiteratureClaimsForExperiment(
	experimentSlug: string,
	context: LiteratureClaimPromotionContext = {}
) {
	return participantLiteratureClaimsForExperimentFrom(
		literatureExtractions,
		experimentSlug,
		context
	);
}

export function literatureClaimReviewQueue(context: LiteratureClaimPromotionContext = {}) {
	return literatureClaimReviewQueueFrom(literatureExtractions, context);
}

export function getLiteratureExtractionExport(context: LiteratureClaimPromotionContext = {}) {
	return getLiteratureExtractionExportFor(literatureExtractions, context);
}

export function getLiteratureExtractionCsv(context: LiteratureClaimPromotionContext = {}): string {
	return getLiteratureExtractionCsvFor(literatureExtractions, context);
}
