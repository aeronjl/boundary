import {
	formatInterpretationDegrees,
	formatInterpretationPercent,
	formatInterpretationScore,
	researchContextDisclaimer,
	type EvidenceReference,
	type ExperimentInterpretation,
	type InterpretationCard,
	type RelatedTaskPrompt
} from '$lib/experiments/interpretation';
import { banditEvidenceReferences } from '$lib/experiments/bandit-interpretation';
import { intertemporalEvidenceReferences } from '$lib/experiments/intertemporal-interpretation';
import { nBackEvidenceReferences } from '$lib/experiments/n-back-interpretation';
import { orientationEvidenceReferences } from '$lib/experiments/orientation-interpretation';
import {
	crossTaskRelationshipsForExperiment,
	relationshipEvidenceReferencesForExperiment,
	relatedTaskPromptFromRelationship
} from '$lib/reference-data/relationships';
import {
	participantLiteratureClaimsForExperiment,
	type ParticipantLiteratureClaim
} from '$lib/reference-data/literature';

export type StudySynthesisTask = {
	slug: string;
	name: string;
	status: string;
	resultSummary: unknown;
};

type StudySynthesisLiteratureClaim = ParticipantLiteratureClaim & {
	taskName: string;
	taskSlug: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function numberValue(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function resultFor(tasks: StudySynthesisTask[], slug: string): Record<string, unknown> | null {
	const task = tasks.find((candidate) => candidate.slug === slug);
	return isRecord(task?.resultSummary) ? task.resultSummary : null;
}

function metric(result: Record<string, unknown> | null, key: string): number | null {
	return result ? numberValue(result[key]) : null;
}

function completionCard(tasks: StudySynthesisTask[]): InterpretationCard {
	const completedTasks = tasks.filter((task) => task.status === 'completed').length;

	return {
		title: 'Profile coverage',
		value: `${completedTasks}/${tasks.length} tasks`,
		tone: completedTasks === tasks.length ? 'strong' : 'watch',
		body:
			completedTasks === tasks.length
				? 'All protocol tasks are complete, so Boundary can make first-pass cross-task observations.'
				: 'The profile is incomplete. Finish the remaining study tasks before treating cross-task patterns as stable.',
		evidenceIds: []
	};
}

function completedLiteratureClaims(tasks: StudySynthesisTask[]): StudySynthesisLiteratureClaim[] {
	return tasks
		.filter((task) => task.status === 'completed')
		.flatMap((task) =>
			participantLiteratureClaimsForExperiment(task.slug).map((claim) => ({
				...claim,
				taskName: task.name,
				taskSlug: task.slug
			}))
		);
}

function evidenceContextCard(
	tasks: StudySynthesisTask[],
	claims: StudySynthesisLiteratureClaim[]
): InterpretationCard | null {
	const completedTaskCount = tasks.filter((task) => task.status === 'completed').length;
	if (completedTaskCount === 0) return null;

	const taskNames = [...new Set(claims.map((claim) => claim.taskName))];
	const evidenceCountLabel = claims.length === 1 ? '1 reviewed' : `${claims.length} reviewed`;

	return {
		title: 'Evidence-backed contexts',
		value: claims.length > 0 ? evidenceCountLabel : 'none ready',
		tone: claims.length > 0 ? 'strong' : 'watch',
		body:
			claims.length > 0
				? `Participant-safe literature context is available for ${taskNames.join(' and ')}. These are guarded anchors for interpreting the completed profile, not diagnostic labels.`
				: 'No participant-safe literature context is ready for the completed tasks yet, so the profile should stay descriptive.',
		evidenceIds: claims.map((claim) => claim.id)
	};
}

function perceptualCard(orientation: Record<string, unknown> | null): InterpretationCard | null {
	if (!orientation) return null;

	const accuracy = metric(orientation, 'accuracy');
	const threshold = metric(orientation, 'estimatedThresholdDegrees');

	return {
		title: 'Perceptual baseline',
		value: `${formatInterpretationPercent(accuracy)} / ${formatInterpretationDegrees(threshold)}`,
		tone: accuracy !== null && accuracy >= 0.75 && threshold !== null ? 'strong' : 'watch',
		body:
			accuracy !== null && accuracy >= 0.75 && threshold !== null
				? 'The visual baseline is usable for comparing higher-level task results against low-level perceptual performance.'
				: 'The visual baseline is weak or lacks a threshold estimate, so cognitive-task differences should be interpreted cautiously.',
		evidenceIds: ['farell-pelli-1998']
	};
}

function updatingCard(
	orientation: Record<string, unknown> | null,
	nBack: Record<string, unknown> | null
): InterpretationCard | null {
	if (!nBack) return null;

	const orientationAccuracy = metric(orientation, 'accuracy');
	const sensitivity = metric(nBack, 'sensitivityIndex');
	const nBackAccuracy = metric(nBack, 'accuracy');
	const visualBaselineUsable = orientationAccuracy !== null && orientationAccuracy >= 0.75;
	const lowUpdatingSignal =
		(sensitivity !== null && sensitivity < 0.8) || (nBackAccuracy !== null && nBackAccuracy < 0.65);

	return {
		title: 'Working-memory contrast',
		value: `d' ${formatInterpretationScore(sensitivity)}`,
		tone: lowUpdatingSignal
			? 'watch'
			: sensitivity !== null && sensitivity >= 1.5
				? 'strong'
				: 'neutral',
		body:
			visualBaselineUsable && lowUpdatingSignal
				? 'The n-back signal is weaker than the perceptual baseline, which makes working-memory updating a useful next repeat target.'
				: 'The n-back result adds a working-memory updating signal that can be compared with perceptual and decision-task results.',
		evidenceIds: ['meule-2017', 'owen-2005']
	};
}

function decisionCard(
	intertemporal: Record<string, unknown> | null,
	bandit: Record<string, unknown> | null
): InterpretationCard | null {
	if (!intertemporal && !bandit) return null;

	const delayedChoiceRate =
		intertemporal &&
		metric(intertemporal, 'delayedChoiceCount') !== null &&
		metric(intertemporal, 'totalTrials') !== null
			? (metric(intertemporal, 'delayedChoiceCount') ?? 0) /
				Math.max(1, metric(intertemporal, 'totalTrials') ?? 1)
			: null;
	const totalReward = metric(bandit, 'totalReward');

	return {
		title: 'Decision-task context',
		value: bandit
			? `reward ${formatInterpretationScore(totalReward, 0)}`
			: `delayed ${formatInterpretationPercent(delayedChoiceRate)}`,
		tone: 'neutral',
		body:
			intertemporal && bandit
				? 'The study now has both delay-choice and reward-learning signals, which are useful comparison axes for later reference datasets.'
				: 'The completed decision task adds context, but the paired decision task would make this part of the profile more interpretable.',
		evidenceIds:
			intertemporal && bandit
				? ['frederick-2002', 'green-myerson-2004', 'sutton-barto-2018', 'steyvers-2009']
				: intertemporal
					? ['frederick-2002', 'green-myerson-2004']
					: ['sutton-barto-2018', 'steyvers-2009', 'wilson-2014']
	};
}

function traitCard(tipi: Record<string, unknown> | null): InterpretationCard | null {
	if (!tipi) return null;

	return {
		title: 'Self-report context',
		value: 'trait inventory',
		tone: 'neutral',
		body: 'The personality inventory is context for later analyses, not an explanation of task performance by itself.',
		evidenceIds: []
	};
}

function uniquePromptsByHref(prompts: RelatedTaskPrompt[]): RelatedTaskPrompt[] {
	const byHref = new Map(prompts.map((prompt) => [prompt.href, prompt]));
	return [...byHref.values()];
}

function registryPromptsForStudy(tasks: StudySynthesisTask[]): RelatedTaskPrompt[] {
	const completedTaskSlugs = new Set(
		tasks.filter((task) => task.status === 'completed').map((task) => task.slug)
	);
	const incompleteTaskSlugs = new Set(
		tasks.filter((task) => task.status !== 'completed').map((task) => task.slug)
	);

	return [...completedTaskSlugs].flatMap((slug) =>
		crossTaskRelationshipsForExperiment(slug)
			.filter((relationship) => incompleteTaskSlugs.has(relationship.targetExperimentSlug))
			.map(relatedTaskPromptFromRelationship)
	);
}

function claimEvidenceIdForTask(
	claims: StudySynthesisLiteratureClaim[],
	taskSlug: string,
	fallbackEvidenceId: string
): string {
	return claims.find((claim) => claim.taskSlug === taskSlug)?.id ?? fallbackEvidenceId;
}

function createPrompts(
	tasks: StudySynthesisTask[],
	orientation: Record<string, unknown> | null,
	nBack: Record<string, unknown> | null,
	literatureClaims: StudySynthesisLiteratureClaim[]
): RelatedTaskPrompt[] {
	const incompleteTask = tasks.find((task) => task.status !== 'completed');
	const prompts: RelatedTaskPrompt[] = [];

	if (incompleteTask) {
		prompts.push({
			title: 'Continue the study',
			body: `${incompleteTask.name} is the next incomplete task in the protocol.`,
			href: '/study',
			evidenceIds: []
		});
	}

	const orientationAccuracy = metric(orientation, 'accuracy');
	const orientationThreshold = metric(orientation, 'estimatedThresholdDegrees');
	const nBackSensitivity = metric(nBack, 'sensitivityIndex');

	if (
		orientation &&
		(orientationAccuracy === null || orientationAccuracy < 0.65 || orientationThreshold === null)
	) {
		prompts.push({
			title: 'Repeat orientation baseline',
			body: 'Clarify the perceptual baseline before leaning on cross-task interpretation; the reviewed orientation methods context is available, but this run did not establish a usable threshold.',
			href: '/orientation-discrimination',
			evidenceIds: [
				claimEvidenceIdForTask(literatureClaims, 'orientation-discrimination', 'farell-pelli-1998')
			]
		});
	} else if (nBack && nBackSensitivity !== null && nBackSensitivity < 0.8) {
		prompts.push({
			title: 'Repeat n-back',
			body: 'A second run would clarify whether the weak updating signal is stable before comparing it with the reviewed n-back reference context.',
			href: '/n-back',
			evidenceIds: [claimEvidenceIdForTask(literatureClaims, 'n-back', 'meule-2017')]
		});
	}

	prompts.push(...registryPromptsForStudy(tasks));

	return uniquePromptsByHref(prompts).slice(0, 2);
}

function literatureReferencesForClaims(
	claims: StudySynthesisLiteratureClaim[]
): EvidenceReference[] {
	return claims.map((claim) => ({
		id: claim.id,
		shortCitation: claim.sourceCitation,
		title: claim.title,
		url: claim.sourceUrl,
		takeaway: `${claim.body} ${claim.caveat}`
	}));
}

function uniqueReferences(references: EvidenceReference[]): EvidenceReference[] {
	const byId = new Map(references.map((reference) => [reference.id, reference]));
	return [...byId.values()];
}

function referencesFor(
	references: EvidenceReference[],
	cards: InterpretationCard[],
	prompts: RelatedTaskPrompt[]
): EvidenceReference[] {
	const evidenceIds = new Set([
		...cards.flatMap((card) => card.evidenceIds),
		...prompts.flatMap((prompt) => prompt.evidenceIds)
	]);

	return uniqueReferences(references).filter((reference) => evidenceIds.has(reference.id));
}

export function createStudyProfileInterpretation(
	tasks: StudySynthesisTask[]
): ExperimentInterpretation | null {
	if (tasks.length === 0) return null;

	const orientation = resultFor(tasks, 'orientation-discrimination');
	const intertemporal = resultFor(tasks, 'intertemporal-choice');
	const nBack = resultFor(tasks, 'n-back');
	const bandit = resultFor(tasks, 'n-armed-bandit');
	const tipi = resultFor(tasks, 'ten-item-personality-inventory');
	const literatureClaims = completedLiteratureClaims(tasks);
	const optionalCards = [
		evidenceContextCard(tasks, literatureClaims),
		perceptualCard(orientation),
		updatingCard(orientation, nBack),
		decisionCard(intertemporal, bandit),
		traitCard(tipi)
	].filter((card): card is InterpretationCard => card !== null);
	const cards = [completionCard(tasks), ...optionalCards];
	const relatedPrompts = createPrompts(tasks, orientation, nBack, literatureClaims);
	const references = referencesFor(
		[
			...orientationEvidenceReferences,
			...nBackEvidenceReferences,
			...banditEvidenceReferences,
			...intertemporalEvidenceReferences,
			...literatureReferencesForClaims(literatureClaims),
			...tasks
				.filter((task) => task.status === 'completed')
				.flatMap((task) => relationshipEvidenceReferencesForExperiment(task.slug))
		],
		cards,
		relatedPrompts
	);

	return {
		disclaimer: researchContextDisclaimer,
		cards,
		relatedPrompts,
		references
	};
}
