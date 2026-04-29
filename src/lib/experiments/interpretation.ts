export type ExperimentRoutePath =
	| '/orientation-discrimination'
	| '/intertemporal-choice'
	| '/n-back'
	| '/n-armed-bandit'
	| '/ten-item-personality-inventory'
	| '/study';

export type EvidenceReference = {
	id: string;
	shortCitation: string;
	title: string;
	url: string;
	doi?: string;
	takeaway: string;
};

export type OpenDatasetCandidate = {
	id: string;
	name: string;
	url: string;
	status: 'candidate';
	note: string;
};

export type InterpretationCard = {
	title: string;
	value: string;
	tone: 'strong' | 'neutral' | 'watch';
	body: string;
	evidenceIds: string[];
};

export type RelatedTaskPrompt = {
	title: string;
	body: string;
	href: ExperimentRoutePath;
	evidenceIds: string[];
};

export type ExperimentInterpretation = {
	disclaimer: string;
	cards: InterpretationCard[];
	relatedPrompts: RelatedTaskPrompt[];
	references: EvidenceReference[];
};

export const researchContextDisclaimer =
	'These comparisons are research context for a short task run. They are not medical, diagnostic, or eligibility advice.';

export const formatInterpretationPercent = (value: number | null) =>
	value === null ? '-' : `${(value * 100).toFixed(0)}%`;

export const formatInterpretationScore = (value: number | null, fractionDigits = 2) =>
	value === null ? '-' : value.toFixed(fractionDigits);

export const formatInterpretationMs = (value: number | null) =>
	value === null ? '-' : `${Math.round(value)} ms`;

export const formatInterpretationDegrees = (value: number | null) =>
	value === null ? 'not reached' : `${formatInterpretationScore(value, 1)} deg`;
