import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type LiteratureClaimPromotionContext } from '$lib/reference-data/literature';
import {
	getLiteratureExtractionCsvFor,
	getLiteratureExtractionExportFor,
	literatureClaimPromotionBlockersFor,
	literatureComparisonClaimStatuses,
	literatureParticipantUses,
	parseLiteratureExtraction,
	validateLiteratureExtractions,
	type LiteratureComparisonClaimStatus,
	type LiteratureParticipantUse,
	type StructuredLiteratureExtraction
} from '$lib/reference-data/literature-schema';
import { referenceComparisonBlockers } from '$lib/reference-data/readiness';
import { db } from '$lib/server/db';
import {
	referenceDatasets,
	referenceMetricMappings,
	referenceMetrics
} from '$lib/server/db/schema';

type LoadedAdminLiteratureExtraction = {
	filePath: string;
	extraction: StructuredLiteratureExtraction;
};

type AdminLiteratureUpdateResult = {
	ok: boolean;
	status: number;
	message: string;
};

type AdminSetLiteratureClaimReviewInput = {
	claimId: string;
	status: string;
	participantUse: string;
};

const literatureDirectoryPath = join(process.cwd(), 'static/reference-data/literature');

function sourceColumnsValue(value: string): string[] {
	try {
		const parsed = JSON.parse(value) as unknown;
		return Array.isArray(parsed)
			? parsed.filter((item): item is string => typeof item === 'string')
			: [];
	} catch {
		return [];
	}
}

function parseComparisonClaimStatus(value: string): LiteratureComparisonClaimStatus {
	const status = value.trim();
	if (literatureComparisonClaimStatuses.includes(status as LiteratureComparisonClaimStatus)) {
		return status as LiteratureComparisonClaimStatus;
	}

	throw new Error(`Unsupported literature claim status: ${value}.`);
}

function parseParticipantUse(value: string): LiteratureParticipantUse {
	const participantUse = value.trim();
	if (literatureParticipantUses.includes(participantUse as LiteratureParticipantUse)) {
		return participantUse as LiteratureParticipantUse;
	}

	throw new Error(`Unsupported participant use: ${value}.`);
}

async function readAdminLiteratureExtractions(): Promise<LoadedAdminLiteratureExtraction[]> {
	const fileNames = (await readdir(literatureDirectoryPath))
		.filter((fileName) => fileName.endsWith('.json'))
		.sort();

	return Promise.all(
		fileNames.map(async (fileName) => {
			const filePath = join(literatureDirectoryPath, fileName);
			const raw = JSON.parse(await readFile(filePath, 'utf8')) as unknown;

			return {
				filePath,
				extraction: parseLiteratureExtraction(raw, filePath)
			};
		})
	);
}

export async function getReadyRegistryMetricKeys(): Promise<Set<string>> {
	const [datasets, metrics, mappings] = await Promise.all([
		db.select().from(referenceDatasets),
		db.select().from(referenceMetrics),
		db.select().from(referenceMetricMappings)
	]);
	const datasetById = new Map(datasets.map((dataset) => [dataset.id, dataset]));
	const mappingByMetricId = new Map(
		mappings.map((mapping) => [mapping.referenceMetricId, mapping])
	);
	const readyMetricKeys = new Set<string>();

	for (const metric of metrics) {
		const dataset = datasetById.get(metric.referenceDatasetId);
		if (!dataset) continue;

		const mapping = mappingByMetricId.get(metric.id);
		const blockers = referenceComparisonBlockers({
			dataset,
			metric,
			mapping: mapping
				? {
						...mapping,
						sourceColumns: sourceColumnsValue(mapping.sourceColumnsJson)
					}
				: null
		});

		if (blockers.length === 0) {
			readyMetricKeys.add(`${metric.experimentSlug}:${metric.metricKey}`);
		}
	}

	return readyMetricKeys;
}

export async function getAdminLiteraturePromotionContext(): Promise<LiteratureClaimPromotionContext> {
	return {
		readyRegistryMetricKeys: await getReadyRegistryMetricKeys()
	};
}

export async function getAdminLiteratureExtractionExport() {
	const loadedExtractions = await readAdminLiteratureExtractions();
	return getLiteratureExtractionExportFor(
		loadedExtractions.map((loaded) => loaded.extraction),
		await getAdminLiteraturePromotionContext()
	);
}

export async function getAdminLiteratureExtractionCsv(): Promise<string> {
	const loadedExtractions = await readAdminLiteratureExtractions();
	return getLiteratureExtractionCsvFor(
		loadedExtractions.map((loaded) => loaded.extraction),
		await getAdminLiteraturePromotionContext()
	);
}

export async function setAdminLiteratureClaimReview(
	input: AdminSetLiteratureClaimReviewInput
): Promise<AdminLiteratureUpdateResult> {
	const claimStatus = parseComparisonClaimStatus(input.status);
	const participantUse = parseParticipantUse(input.participantUse);
	const loadedExtractions = await readAdminLiteratureExtractions();
	const target = loadedExtractions.find((loaded) =>
		loaded.extraction.comparisonClaims.some((claim) => claim.id === input.claimId)
	);

	if (!target) {
		return {
			ok: false,
			status: 404,
			message: 'Literature comparison claim not found.'
		};
	}

	const currentClaim = target.extraction.comparisonClaims.find(
		(claim) => claim.id === input.claimId
	);
	if (!currentClaim) {
		return {
			ok: false,
			status: 404,
			message: 'Literature comparison claim not found.'
		};
	}

	const promotionContext = await getAdminLiteraturePromotionContext();
	const promotionBlockers = literatureClaimPromotionBlockersFor(
		target.extraction,
		currentClaim,
		promotionContext
	);

	if (participantUse === 'public_prompt_ready' && promotionBlockers.length > 0) {
		return {
			ok: false,
			status: 400,
			message: `Resolve blocker(s) before public promotion: ${promotionBlockers.join(' ')}`
		};
	}

	const updatedExtraction: StructuredLiteratureExtraction = {
		...target.extraction,
		comparisonClaims: target.extraction.comparisonClaims.map((claim) =>
			claim.id === input.claimId
				? {
						...claim,
						status: claimStatus,
						participantUse
					}
				: claim
		),
		updatedAt: new Date().toISOString().slice(0, 10)
	};
	const updatedExtractions = loadedExtractions.map((loaded) =>
		loaded === target ? updatedExtraction : loaded.extraction
	);
	const validationIssues = validateLiteratureExtractions(updatedExtractions, promotionContext);

	if (validationIssues.length > 0) {
		return {
			ok: false,
			status: 400,
			message: `Literature validation failed: ${validationIssues.map((issue) => issue.message).join(' ')}`
		};
	}

	try {
		await writeFile(target.filePath, `${JSON.stringify(updatedExtraction, null, '\t')}\n`);
	} catch (error) {
		return {
			ok: false,
			status: 500,
			message:
				`Could not update source JSON. Run this action locally before committing the literature file. ${error instanceof Error ? error.message : ''}`.trim()
		};
	}

	return {
		ok: true,
		status: 200,
		message:
			participantUse === 'public_prompt_ready'
				? 'Literature claim promoted to public-ready.'
				: 'Literature claim moved to internal review.'
	};
}
