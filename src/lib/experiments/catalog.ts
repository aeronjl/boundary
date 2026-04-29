export type ExperimentCatalogEntry = {
	slug: string;
	path: string;
	name: string;
	taskType: string;
	estimatedDuration: string;
	readiness: 'ready';
	dataCaptured: string[];
	instructions: string[];
	debrief: string;
};

export const experimentCatalog = [
	{
		slug: 'orientation-discrimination',
		path: '/orientation-discrimination',
		name: 'Orientation discrimination',
		taskType: 'Psychophysics',
		estimatedDuration: '2 minutes',
		readiness: 'ready',
		dataCaptured: ['tilt angle', 'chosen direction', 'correctness', 'response time'],
		instructions: [
			'Judge whether the black line tilts counterclockwise or clockwise from vertical.',
			'Respond as accurately as you can. The dashed reference line marks vertical.'
		],
		debrief: 'This task estimates how reliably small visual orientation differences are classified.'
	},
	{
		slug: 'intertemporal-choice',
		path: '/intertemporal-choice',
		name: 'Intertemporal choice',
		taskType: 'Decision making',
		estimatedDuration: '2 minutes',
		readiness: 'ready',
		dataCaptured: ['chosen option', 'reward amount', 'delay', 'net value', 'response time'],
		instructions: [
			'Choose between immediate and delayed income options.',
			'Delay has a point cost, so compare the visible net value before choosing.'
		],
		debrief: 'This task records tradeoffs between immediate income and larger delayed income.'
	},
	{
		slug: 'n-back',
		path: '/n-back',
		name: 'n-back',
		taskType: 'Working memory',
		estimatedDuration: '3 minutes',
		readiness: 'ready',
		dataCaptured: [
			'grid position',
			'expected match',
			'match response',
			'correctness',
			'response time'
		],
		instructions: [
			'Decide whether the current active square matches the position from n trials ago.',
			'Choose no match during the first trials before enough history exists.'
		],
		debrief: 'This task measures working-memory updating through hits, misses, and false alarms.'
	},
	{
		slug: 'n-armed-bandit',
		path: '/n-armed-bandit',
		name: 'n-armed bandit',
		taskType: 'Reward learning',
		estimatedDuration: '3 minutes',
		readiness: 'ready',
		dataCaptured: ['selected arm', 'reward outcome', 'hidden reward probability', 'response time'],
		instructions: [
			'Choose one arm each trial to collect rewards.',
			'Arms have hidden reward probabilities, so use feedback to adapt your choices.'
		],
		debrief: 'This task records exploration and exploitation while reward probabilities are hidden.'
	},
	{
		slug: 'ten-item-personality-inventory',
		path: '/ten-item-personality-inventory',
		name: 'Ten Item Personality Inventory',
		taskType: 'Self-report',
		estimatedDuration: '2 minutes',
		readiness: 'ready',
		dataCaptured: ['Likert responses', 'scored personality dimensions', 'response time'],
		instructions: [
			'Rate how well each pair of traits describes you.',
			'Use the full scale when it fits; there are no right or wrong answers.'
		],
		debrief: 'This inventory gives a compact Big Five score from ten self-report ratings.'
	}
] as const satisfies ExperimentCatalogEntry[];

export function getExperimentCatalogEntry(slug: string): ExperimentCatalogEntry {
	const entry = experimentCatalog.find((experiment) => experiment.slug === slug);

	if (!entry) {
		throw new Error(`Unknown experiment catalog entry: ${slug}`);
	}

	return entry;
}
