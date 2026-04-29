import { createHash } from 'node:crypto';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

type GenericExportResponse = {
	metadata: {
		timing: {
			responseTimeMs: number;
		};
	};
};

type GenericExportRun = {
	id: string;
	experimentVersionId: string;
	responses: GenericExportResponse[];
	events: { eventType: string }[];
	intertemporalSummary?: { delayedChoiceCount: number } | null;
	orientationSummary?: {
		totalTrials: number;
		correctCount: number;
		magnitudeSummaries: unknown[];
		estimatedThresholdDegrees: number | null;
	} | null;
	nBackSummary?: {
		totalTrials: number;
		correctCount: number;
		sensitivityIndex: number | null;
	} | null;
};

type StudyExportTask = {
	slug: string;
	status: string;
	runId: string | null;
	metrics: string[];
	metricValues: { key: string; value: number | string | null }[];
};

type StudyExportStudy = {
	id: string;
	completedTasks: number;
	totalTasks: number;
	profileInterpretation: { cards: { title: string }[] } | null;
	integrityFlags: { code: string; label: string }[];
	qualityFlags: { code: string; label: string }[];
	needsReview: boolean;
	review: { status: string; reason: string | null; note: string };
	tasks: (StudyExportTask & { resultSummary: unknown })[];
};

const testAdminCookie = `boundary_admin=${createHash('sha256').update('test-admin-token').digest('hex')}`;

async function acceptConsentAndStart(page: Page) {
	await expect(page.getByRole('heading', { name: 'Before you start' })).toBeVisible();
	const consent = page.getByLabel(/I consent to take part/);

	if (await consent.isVisible()) {
		await consent.check();
		await page.getByRole('button', { name: 'Accept and start' }).click();
	} else {
		await page.getByRole('button', { name: 'Start' }).click();
	}
}

async function completeTipiRun(page: Page) {
	await page.goto('/ten-item-personality-inventory');
	await acceptConsentAndStart(page);

	for (let trial = 1; trial <= 10; trial++) {
		await expect(page.getByText(`Question ${trial} of 10`)).toBeVisible();
		await page.getByRole('radio', { name: 'Agree a little', exact: true }).check();
		await page.getByRole('button', { name: 'Submit' }).click();
	}

	await expect(page.getByText('You have completed the inventory.')).toBeVisible();
}

async function completeBanditRun(page: Page) {
	await page.goto('/n-armed-bandit');
	await acceptConsentAndStart(page);

	for (let trial = 1; trial <= 20; trial++) {
		await expect(page.getByText(`Trial ${trial} of 20`)).toBeVisible();
		await page.getByRole('button', { name: 'Choose arm A' }).click();
	}

	await expect(page.getByRole('heading', { name: 'Bandit run complete' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'How this compares' })).toBeVisible();
	await expect(page.getByText('Reward yield', { exact: true })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Reference context' })).toBeVisible();
}

async function completeIntertemporalRun(page: Page) {
	await page.goto('/intertemporal-choice');
	await acceptConsentAndStart(page);

	for (let trial = 1; trial <= 8; trial++) {
		await expect(page.getByText(`${trial} of 8`)).toBeVisible();
		await page.getByRole('button', { name: 'Choose later option' }).click();
	}

	await expect(page.getByRole('heading', { name: 'Intertemporal choice complete' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'How this compares' })).toBeVisible();
	await expect(page.getByText('Delay preference', { exact: true })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Reference context' })).toBeVisible();
}

async function completeOrientationRun(page: Page) {
	await page.goto('/orientation-discrimination');
	await acceptConsentAndStart(page);

	for (let trial = 1; trial <= 16; trial++) {
		await expect(page.getByText(`${trial} of 16`)).toBeVisible();
		await page.getByRole('button', { name: 'Choose clockwise' }).click();
	}

	await expect(
		page.getByRole('heading', { name: 'Orientation discrimination complete' })
	).toBeVisible();
	await expect(page.getByRole('heading', { name: 'How this compares' })).toBeVisible();
	await expect(page.getByText('Perceptual accuracy')).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Reference context' })).toBeVisible();
}

async function completeNBackRun(page: Page) {
	await page.goto('/n-back');
	await acceptConsentAndStart(page);

	for (let trial = 1; trial <= 16; trial++) {
		await expect(page.getByText(`${trial} of 16`)).toBeVisible();
		await page.getByRole('button', { name: 'Choose no match' }).click();
	}

	await expect(page.getByRole('heading', { name: 'n-back complete' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'How this compares' })).toBeVisible();
	await expect(page.getByText('Signal sensitivity')).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Reference context' })).toBeVisible();
}

test('index page has expected h1', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Boundary' })).toBeVisible();
});

test('health endpoint reports readiness', async ({ request }) => {
	const response = await request.get('/health');

	expect(response.status()).toBe(200);
	expect(response.headers()['cache-control']).toContain('no-store');
	expect(await response.json()).toMatchObject({
		ok: true,
		checkedAt: expect.any(String),
		database: {
			ok: true,
			remote: false
		}
	});
});

test('experiment starts require participant consent', async ({ page, request }) => {
	const blocked = await request.post('/api/experiments/n-back/runs');
	expect(blocked.status()).toBe(403);
	expect(await blocked.json()).toMatchObject({
		message: expect.stringContaining('consent')
	});

	await page.goto('/n-back');
	await expect(page.getByRole('heading', { name: 'Before you start' })).toBeVisible();
	await expect(page.getByText('Estimated duration')).toBeVisible();
	await page.getByLabel(/I consent to take part/).check();
	await page.getByRole('button', { name: 'Accept and start' }).click();
	await expect(page.getByText('1 of 16')).toBeVisible();
});

test('experiment submissions enforce run integrity', async ({ request }) => {
	const blockedSubmission = await request.post('/api/experiments/tipi/runs/not-a-run/responses', {
		data: {
			questionId: 'tipi-v1-1',
			response: 'Agree a little',
			trialIndex: 0
		}
	});
	expect(blockedSubmission.status()).toBe(403);

	await request.post('/api/consent');
	const startResponse = await request.post('/api/experiments/tipi/runs');
	expect(startResponse.status()).toBe(200);
	const start = await startResponse.json();
	const runId = start.runId as string;
	const firstQuestionId = start.question.id as string;

	const invalidRunResponse = await request.post('/api/experiments/tipi/runs/not-a-run/responses', {
		data: {
			questionId: firstQuestionId,
			response: 'Agree a little',
			trialIndex: 0
		}
	});
	expect(invalidRunResponse.status()).toBe(404);

	const wrongTrialResponse = await request.post(`/api/experiments/tipi/runs/${runId}/responses`, {
		data: {
			questionId: firstQuestionId,
			response: 'Agree a little',
			trialIndex: 1
		}
	});
	expect(wrongTrialResponse.status()).toBe(400);
	expect(await wrongTrialResponse.json()).toMatchObject({
		message: expect.stringContaining('next expected trial')
	});

	const firstSubmitResponse = await request.post(`/api/experiments/tipi/runs/${runId}/responses`, {
		data: {
			questionId: firstQuestionId,
			response: 'Agree a little',
			trialIndex: 0,
			trialStartedAt: start.trialStartedAt,
			submittedAt: Date.now()
		}
	});
	expect(firstSubmitResponse.status()).toBe(200);
	const firstSubmit = await firstSubmitResponse.json();
	expect(firstSubmit).toMatchObject({ completed: false, trialNumber: 2 });

	const retryResponse = await request.post(`/api/experiments/tipi/runs/${runId}/responses`, {
		data: {
			questionId: firstQuestionId,
			response: 'Agree a little',
			trialIndex: 0
		}
	});
	expect(retryResponse.status()).toBe(200);
	expect(await retryResponse.json()).toMatchObject({ completed: false, trialNumber: 2 });

	const conflictingRetryResponse = await request.post(
		`/api/experiments/tipi/runs/${runId}/responses`,
		{
			data: {
				questionId: firstQuestionId,
				response: 'Disagree a little',
				trialIndex: 0
			}
		}
	);
	expect(conflictingRetryResponse.status()).toBe(409);
	expect(await conflictingRetryResponse.json()).toMatchObject({
		message: expect.stringContaining('already submitted with different data')
	});

	let state = firstSubmit;

	while (!state.completed) {
		const trialIndex = state.trialNumber - 1;
		const response = await request.post(`/api/experiments/tipi/runs/${runId}/responses`, {
			data: {
				questionId: state.question.id,
				response: 'Agree a little',
				trialIndex,
				trialStartedAt: state.trialStartedAt,
				submittedAt: Date.now()
			}
		});

		expect(response.status()).toBe(200);
		state = await response.json();
	}

	expect(state).toMatchObject({ completed: true, runId });

	const completedRetryResponse = await request.post(
		`/api/experiments/tipi/runs/${runId}/responses`,
		{
			data: {
				questionId: firstQuestionId,
				response: 'Agree a little',
				trialIndex: 0
			}
		}
	);
	expect(completedRetryResponse.status()).toBe(200);
	expect(await completedRetryResponse.json()).toMatchObject({ completed: true, runId });

	const exportResponse = await request.get('/admin/experiments/export.json', {
		headers: { cookie: testAdminCookie }
	});
	expect(exportResponse.status()).toBe(200);
	const exportBody = await exportResponse.json();
	const run = exportBody.runs.find((candidate: GenericExportRun) => candidate.id === runId);
	expect(run?.responses).toHaveLength(10);
});

test('ten item personality inventory records and displays results', async ({ page }) => {
	await completeTipiRun(page);
	await page.getByRole('button', { name: 'Results' }).click();
	await expect(page.getByText('Extroversion')).toBeVisible();
	await expect(page.getByText('/ 7').first()).toBeVisible();
});

test('ten item personality inventory resumes saved runs after reload', async ({ page }) => {
	await page.goto('/ten-item-personality-inventory');
	await acceptConsentAndStart(page);

	await expect(page.getByText('Question 1 of 10')).toBeVisible();
	await page.getByRole('radio', { name: 'Agree a little', exact: true }).check();
	await page.getByRole('button', { name: 'Submit' }).click();
	await expect(page.getByText('Question 2 of 10')).toBeVisible();

	await page.reload();
	await expect(page.getByText('Question 2 of 10')).toBeVisible();

	for (let trial = 2; trial <= 10; trial++) {
		await expect(page.getByText(`Question ${trial} of 10`)).toBeVisible();
		await page.getByRole('radio', { name: 'Agree a little', exact: true }).check();
		await page.getByRole('button', { name: 'Submit' }).click();
	}

	await expect(page.getByText('You have completed the inventory.')).toBeVisible();

	await page.reload();
	await expect(page.getByText('You have completed the inventory.')).toBeVisible();

	await page.evaluate(() => {
		localStorage.setItem('boundary:run:ten-item-personality-inventory', 'not-a-run');
	});
	await page.goto('/ten-item-personality-inventory');
	await expect(page.getByRole('heading', { name: 'Before you start' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
	expect(
		await page.evaluate(() => localStorage.getItem('boundary:run:ten-item-personality-inventory'))
	).toBeNull();
});

test('study runner tracks task progress across experiments', async ({ page }) => {
	await page.goto('/study');
	await expect(page.getByRole('heading', { name: 'Boundary study' })).toBeVisible();
	await page.getByLabel(/I consent to take part in this study/).check();
	await page.getByRole('button', { name: 'Accept and start study' }).click();

	await expect(page.getByText('0 of 5')).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Orientation discrimination' })).toBeVisible();
	await page.getByRole('link', { name: 'Start task' }).click();

	await expect(page).toHaveURL(/\/orientation-discrimination\?study=/);
	await page.getByRole('button', { name: 'Start' }).click();

	for (let trial = 1; trial <= 16; trial++) {
		await expect(page.getByText(`${trial} of 16`)).toBeVisible();
		await page.getByRole('button', { name: 'Choose clockwise' }).click();
	}

	await expect(
		page.getByRole('heading', { name: 'Orientation discrimination complete' })
	).toBeVisible();
	await page.getByRole('link', { name: 'Continue study' }).click();

	await expect(page).toHaveURL(/\/study$/);
	await expect(page.getByText('1 of 5')).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Intertemporal choice' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Start task' })).toHaveAttribute(
		'href',
		/intertemporal-choice/
	);
	const orientationRow = page.getByRole('row').filter({ hasText: 'Orientation discrimination' });
	await expect(orientationRow).toContainText('completed');

	await page.reload();
	await expect(page.getByText('1 of 5')).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Intertemporal choice' })).toBeVisible();

	await page.goto('/admin');
	await page.getByLabel('Admin token').fill('test-admin-token');
	await page.getByRole('button', { name: 'Sign in' }).click();
	await page.getByRole('link', { name: 'Study sessions' }).click();
	await expect(page.getByRole('heading', { name: 'Study sessions' })).toBeVisible();
	await expect(page.getByText('1 of 5').first()).toBeVisible();
	await expect(page.getByText('Intertemporal choice').first()).toBeVisible();

	const studiesJsonResponse = await page.request.get('/admin/studies/export.json');
	expect(studiesJsonResponse.status()).toBe(200);
	const studiesJson = await studiesJsonResponse.json();
	const studyExport = studiesJson.studies.find(
		(study: StudyExportStudy) =>
			study.completedTasks === 1 &&
			study.totalTasks === 5 &&
			study.tasks.some(
				(task) =>
					task.slug === 'orientation-discrimination' &&
					task.status === 'completed' &&
					task.runId !== null
			)
	);
	expect(studyExport).toBeTruthy();
	expect(studyExport.integrityFlags.map((flag: { code: string }) => flag.code)).toContain(
		'partial_session'
	);
	expect(studyExport.needsReview).toBe(true);
	expect(studyExport.qualityFlags.map((flag: { code: string }) => flag.code)).toContain(
		'incomplete_study_session'
	);
	expect(
		studyExport.tasks.find(
			(task: StudyExportStudy['tasks'][number]) => task.slug === 'orientation-discrimination'
		)?.metricValues
	).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'accuracy' })]));

	const studiesCsvResponse = await page.request.get('/admin/studies/export.csv');
	expect(studiesCsvResponse.status()).toBe(200);
	expect(await studiesCsvResponse.text()).toContain('"study_session_id","participant_session_id"');

	await page.goto('/admin/studies?quality=needs_review');
	await expect(page.getByText('1 of 5').first()).toBeVisible();
	const partialStudyRow = page.getByRole('row').filter({ hasText: '1 of 5' }).first();
	await expect(partialStudyRow).toContainText('needs review');

	const studyLink = partialStudyRow.getByRole('link', { name: /View study/ });
	const studyHref = await studyLink.getAttribute('href');
	expect(studyHref).toBeTruthy();
	await studyLink.click();
	await expect(page.getByRole('heading', { name: 'Study detail' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Quality review' })).toBeVisible();
	await expect(page.getByText('Study session is incomplete')).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Integrity checks' })).toBeVisible();
	await expect(page.getByText('Partial session')).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Study profile' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Task timeline' })).toBeVisible();
	await expect(page.getByRole('link', { name: /View run/ }).first()).toBeVisible();
	await expect(page.getByText(/accuracy [0-9]+%/).first()).toBeVisible();

	const detailJsonResponse = await page.request.get(`${studyHref}/export.json`);
	expect(detailJsonResponse.status()).toBe(200);
	const detailJson = await detailJsonResponse.json();
	expect(detailJson.studies).toHaveLength(1);
	expect(detailJson.studies[0].id).toBe(studyHref?.split('/').at(-1));
	expect(detailJson.studies[0].profileInterpretation.cards.length).toBeGreaterThan(0);

	const detailCsvResponse = await page.request.get(`${studyHref}/export.csv`);
	expect(detailCsvResponse.status()).toBe(200);
	const detailCsv = await detailCsvResponse.text();
	expect(detailCsv).toContain('"profile_interpretation_json"');
	expect(detailCsv).toContain('"result_summary_json"');
});

test('study runner completes the full protocol and exposes analysis', async ({ page }) => {
	await page.goto('/study');
	await page.getByLabel(/I consent to take part in this study/).check();
	await page.getByRole('button', { name: 'Accept and start study' }).click();
	await expect(page.getByText('0 of 5')).toBeVisible();

	await page.getByRole('link', { name: 'Start task' }).click();
	await page.getByRole('button', { name: 'Start' }).click();
	for (let trial = 1; trial <= 16; trial++) {
		await expect(page.getByText(`${trial} of 16`)).toBeVisible();
		await page.getByRole('button', { name: 'Choose clockwise' }).click();
	}
	await expect(
		page.getByRole('heading', { name: 'Orientation discrimination complete' })
	).toBeVisible();
	await page.getByRole('link', { name: 'Continue study' }).click();
	await expect(page.getByText('1 of 5')).toBeVisible();

	await page.getByRole('link', { name: 'Start task' }).click();
	await page.getByRole('button', { name: 'Start' }).click();
	for (let trial = 1; trial <= 8; trial++) {
		await expect(page.getByText(`${trial} of 8`)).toBeVisible();
		await page.getByRole('button', { name: 'Choose later option' }).click();
	}
	await expect(page.getByRole('heading', { name: 'Intertemporal choice complete' })).toBeVisible();
	await page.getByRole('link', { name: 'Continue study' }).click();
	await expect(page.getByText('2 of 5')).toBeVisible();

	await page.getByRole('link', { name: 'Start task' }).click();
	await page.getByRole('button', { name: 'Start' }).click();
	for (let trial = 1; trial <= 16; trial++) {
		await expect(page.getByText(`${trial} of 16`)).toBeVisible();
		await page.getByRole('button', { name: 'Choose no match' }).click();
	}
	await expect(page.getByRole('heading', { name: 'n-back complete' })).toBeVisible();
	await page.getByRole('link', { name: 'Continue study' }).click();
	await expect(page.getByText('3 of 5')).toBeVisible();

	await page.getByRole('link', { name: 'Start task' }).click();
	await page.getByRole('button', { name: 'Start' }).click();
	for (let trial = 1; trial <= 20; trial++) {
		await expect(page.getByText(`Trial ${trial} of 20`)).toBeVisible();
		await page.getByRole('button', { name: 'Choose arm A' }).click();
	}
	await expect(page.getByRole('heading', { name: 'Bandit run complete' })).toBeVisible();
	await page.getByRole('link', { name: 'Continue study' }).click();
	await expect(page.getByText('4 of 5')).toBeVisible();

	await page.getByRole('link', { name: 'Start task' }).click();
	await page.getByRole('button', { name: 'Start' }).click();
	for (let trial = 1; trial <= 10; trial++) {
		await expect(page.getByText(`Question ${trial} of 10`)).toBeVisible();
		await page.getByRole('radio', { name: 'Agree a little', exact: true }).check();
		await page.getByRole('button', { name: 'Submit' }).click();
	}
	await expect(page.getByText('You have completed the inventory.')).toBeVisible();
	await page.getByRole('link', { name: 'Continue study' }).click();

	await expect(page).toHaveURL(/\/study$/);
	await expect(page.getByText('5 of 5')).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Study complete' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Study profile' })).toBeVisible();
	await expect(page.getByText('Working-memory contrast')).toBeVisible();

	await page.goto('/admin');
	await page.getByLabel('Admin token').fill('test-admin-token');
	await page.getByRole('button', { name: 'Sign in' }).click();

	const studiesJsonResponse = await page.request.get('/admin/studies/export.json');
	expect(studiesJsonResponse.status()).toBe(200);
	const studiesJson = await studiesJsonResponse.json();
	const completedStudy = (studiesJson.studies as StudyExportStudy[]).find(
		(study) =>
			study.completedTasks === 5 &&
			study.totalTasks === 5 &&
			study.tasks.every((task) => task.status === 'completed' && task.resultSummary !== null)
	);
	expect(completedStudy).toBeTruthy();
	if (!completedStudy) throw new Error('Completed study export was not found.');
	expect(completedStudy?.profileInterpretation?.cards.map((card) => card.title)).toContain(
		'Profile coverage'
	);

	await page.getByRole('link', { name: 'Study analysis' }).click();
	await expect(page.getByRole('heading', { name: 'Study analysis' })).toBeVisible();
	await expect(page.locator('p', { hasText: 'Study sessions' }).first()).toBeVisible();
	await expect(page.getByText('Completion rate')).toBeVisible();
	await expect(page.getByText('Median study duration')).toBeVisible();
	await expect(page.getByText('Quality flags')).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Task completion' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Participant summaries' })).toBeVisible();
	await expect(page.getByText('5 of 5').first()).toBeVisible();
	await expect(page.getByText(/Accuracy:/).first()).toBeVisible();
	await expect(page.getByText(/Final wealth:/).first()).toBeVisible();
	await expect(page.getByText(/Extroversion:/).first()).toBeVisible();

	const participantCsvResponse = await page.request.get('/admin/studies/analysis/export.csv');
	expect(participantCsvResponse.status()).toBe(200);
	const participantCsv = await participantCsvResponse.text();
	expect(participantCsv).toContain('"study_session_id","participant_session_id"');
	expect(participantCsv).toContain('"needs_review","quality_flag_count","quality_flags"');
	expect(participantCsv).toContain('"profile_observations","profile_recommendations"');
	expect(participantCsv).toContain('"ten_item_personality_inventory_status"');
	expect(participantCsv).toContain('"orientation_discrimination_accuracy"');
	expect(participantCsv).toContain('"orientation_discrimination_estimated_threshold_degrees"');
	expect(participantCsv).toContain('"intertemporal_choice_final_wealth"');
	expect(participantCsv).toContain('"ten_item_personality_inventory_extroversion"');
	expect(participantCsv).toContain('"completed"');

	const completedStudyId = completedStudy.id as string;
	const completedStudyLinkName = `View study ${completedStudyId.slice(0, 8)}`;

	await page.goto(`/admin/studies/${completedStudyId}`);
	await page.getByLabel('Review status').selectOption('excluded');
	await page.getByLabel('Review reason').selectOption('test_data');
	await page.getByLabel('Review note').fill('Pilot exclusion check');
	await page.getByRole('button', { name: 'Save review' }).click();
	await expect(page.getByText(/excluded\s*\(test data\)/).first()).toBeVisible();

	await page.goto('/admin/studies?review=excluded');
	await expect(page.getByRole('link', { name: completedStudyLinkName })).toBeVisible();

	await page.goto('/admin/studies/analysis');
	await expect(page.getByRole('link', { name: completedStudyLinkName })).toHaveCount(0);

	await page.goto('/admin/studies/analysis?review=excluded');
	await expect(page.getByRole('link', { name: completedStudyLinkName })).toBeVisible();

	const excludedCsvResponse = await page.request.get(
		'/admin/studies/analysis/export.csv?review=excluded'
	);
	expect(excludedCsvResponse.status()).toBe(200);
	const excludedCsv = await excludedCsvResponse.text();
	expect(excludedCsv).toContain(completedStudyId);
	expect(excludedCsv).toContain('"excluded","test_data","Pilot exclusion check"');

	const includedCsvResponse = await page.request.get('/admin/studies/analysis/export.csv');
	expect(includedCsvResponse.status()).toBe(200);
	expect(await includedCsvResponse.text()).not.toContain(completedStudyId);
});

test('n-armed bandit records generic trial data', async ({ page }) => {
	await completeBanditRun(page);

	await page.goto('/admin');
	await page.getByLabel('Admin token').fill('test-admin-token');
	await page.getByRole('button', { name: 'Sign in' }).click();

	const exportResponse = await page.request.get('/admin/experiments/export.json');
	expect(exportResponse.status()).toBe(200);

	const exportBody = await exportResponse.json();
	const banditRun = exportBody.runs.find(
		(run: GenericExportRun) =>
			run.experimentVersionId === 'n-armed-bandit-v1' && run.responses.length === 20
	);

	expect(banditRun).toBeTruthy();
	expect(banditRun?.events.map((event: { eventType: string }) => event.eventType)).toEqual(
		expect.arrayContaining(['run_started', 'trial_started', 'arm_pulled', 'run_completed'])
	);
	expect(banditRun?.responses[0].metadata.timing.responseTimeMs).toEqual(expect.any(Number));

	await page.getByRole('link', { name: 'Experiment runs' }).click();
	await expect(page.getByRole('heading', { name: 'Experiment runs' })).toBeVisible();
	await expect(page.getByRole('cell', { name: 'n-armed bandit' }).first()).toBeVisible();
	await expect(page.getByText('bandit_arm_pull').first()).toBeVisible();

	await page
		.getByRole('link', { name: /View run/ })
		.first()
		.click();
	await expect(page.getByRole('heading', { name: 'Bandit summary' })).toBeVisible();
	await expect(page.getByText('arm_pulled').first()).toBeVisible();
});

test('intertemporal choice records generic trial data', async ({ page }) => {
	await completeIntertemporalRun(page);

	await page.goto('/admin');
	await page.getByLabel('Admin token').fill('test-admin-token');
	await page.getByRole('button', { name: 'Sign in' }).click();

	const exportResponse = await page.request.get('/admin/experiments/export.json');
	expect(exportResponse.status()).toBe(200);

	const exportBody = await exportResponse.json();
	const choiceRun = exportBody.runs.find(
		(run: GenericExportRun) =>
			run.experimentVersionId === 'intertemporal-choice-v1' &&
			run.responses.length === 8 &&
			run.intertemporalSummary?.delayedChoiceCount === 8
	);

	expect(choiceRun).toBeTruthy();
	expect(choiceRun?.events.map((event: { eventType: string }) => event.eventType)).toEqual(
		expect.arrayContaining(['run_started', 'trial_started', 'choice_made', 'run_completed'])
	);
	expect(choiceRun?.responses[0].metadata.timing.responseTimeMs).toEqual(expect.any(Number));

	await page.goto('/admin/experiments?experiment=intertemporal-choice');
	await expect(page.getByRole('heading', { name: 'Experiment runs' })).toBeVisible();
	await expect(page.getByRole('cell', { name: 'Intertemporal choice' }).first()).toBeVisible();
	await expect(page.getByText('intertemporal_choice').first()).toBeVisible();

	await page
		.getByRole('link', { name: /View run/ })
		.first()
		.click();
	await expect(page.getByRole('heading', { name: 'Intertemporal summary' })).toBeVisible();
	await expect(page.getByText('choice_made').first()).toBeVisible();
});

test('orientation discrimination records generic trial data', async ({ page }) => {
	await completeOrientationRun(page);

	await page.goto('/admin');
	await page.getByLabel('Admin token').fill('test-admin-token');
	await page.getByRole('button', { name: 'Sign in' }).click();

	const exportResponse = await page.request.get('/admin/experiments/export.json');
	expect(exportResponse.status()).toBe(200);

	const exportBody = await exportResponse.json();
	const orientationRun = exportBody.runs.find(
		(run: GenericExportRun) =>
			run.experimentVersionId === 'orientation-discrimination-v1' &&
			run.responses.length === 16 &&
			run.orientationSummary?.totalTrials === 16 &&
			run.orientationSummary.magnitudeSummaries.length === 4
	);

	expect(orientationRun).toBeTruthy();
	expect(orientationRun?.orientationSummary?.estimatedThresholdDegrees).toBeNull();
	expect(orientationRun?.events.map((event: { eventType: string }) => event.eventType)).toEqual(
		expect.arrayContaining(['run_started', 'trial_started', 'orientation_judged', 'run_completed'])
	);
	expect(orientationRun?.responses[0].metadata.timing.responseTimeMs).toEqual(expect.any(Number));

	await page.goto('/admin/experiments?experiment=orientation-discrimination');
	await expect(page.getByRole('heading', { name: 'Experiment runs' })).toBeVisible();
	await expect(
		page.getByRole('cell', { name: 'Orientation discrimination' }).first()
	).toBeVisible();
	await expect(page.getByText('orientation_discrimination').first()).toBeVisible();

	await page
		.getByRole('link', { name: /View run/ })
		.first()
		.click();
	await expect(page.getByRole('heading', { name: 'Orientation summary' })).toBeVisible();
	await expect(page.getByText('orientation_judged').first()).toBeVisible();
});

test('n-back records generic trial data', async ({ page }) => {
	await completeNBackRun(page);

	await page.goto('/admin');
	await page.getByLabel('Admin token').fill('test-admin-token');
	await page.getByRole('button', { name: 'Sign in' }).click();

	const exportResponse = await page.request.get('/admin/experiments/export.json');
	expect(exportResponse.status()).toBe(200);

	const exportBody = await exportResponse.json();
	const nBackRun = exportBody.runs.find(
		(run: GenericExportRun) =>
			run.experimentVersionId === 'n-back-v1' &&
			run.responses.length === 16 &&
			run.nBackSummary?.totalTrials === 16 &&
			run.nBackSummary.sensitivityIndex !== null
	);

	expect(nBackRun).toBeTruthy();
	expect(nBackRun?.events.map((event: { eventType: string }) => event.eventType)).toEqual(
		expect.arrayContaining(['run_started', 'trial_started', 'n_back_answered', 'run_completed'])
	);
	expect(nBackRun?.responses[0].metadata.timing.responseTimeMs).toEqual(expect.any(Number));

	await page.goto('/admin/experiments?experiment=n-back');
	await expect(page.getByRole('heading', { name: 'Experiment runs' })).toBeVisible();
	await expect(page.getByRole('cell', { name: 'n-back' }).first()).toBeVisible();
	await expect(page.getByText('n_back_response').first()).toBeVisible();

	await page
		.getByRole('link', { name: /View run/ })
		.first()
		.click();
	await expect(page.getByRole('heading', { name: 'n-back summary' })).toBeVisible();
	await expect(page.getByText('n_back_answered').first()).toBeVisible();
});

test('admin can inspect and export ten item personality inventory data', async ({ page }) => {
	await completeTipiRun(page);

	await page.goto('/admin');
	await page.getByLabel('Admin token').fill('test-admin-token');
	await page.getByRole('button', { name: 'Sign in' }).click();

	await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible();
	await expect(page.getByText('Experiment data overview')).toBeVisible();
	await expect(page.getByRole('link', { name: 'CSV export' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'JSON export' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'All experiment JSON' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'All experiment CSV' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Experiment runs' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Review queue' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Study analysis' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Analysis', exact: true })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Participants' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Reference registry' })).toBeVisible();

	await page.getByRole('link', { name: 'Reference registry' }).click();
	await expect(page.getByRole('heading', { name: 'Reference registry' })).toBeVisible();
	await expect(page.getByText('OpenfMRI ds000115').first()).toBeVisible();
	await expect(page.getByText('Metric contracts', { exact: true })).toBeVisible();
	await expect(page.getByText('Imported reference summary')).toBeVisible();
	await expect(page.getByText('Imported n=98 from nback2_nont, nback2_targ')).toBeVisible();

	const sourceCitation = `Boundary Pilot ${Date.now()}`;
	const createSourceForm = page.locator('form[aria-label="Add literature source"]');
	await createSourceForm.getByLabel('Short citation').fill(sourceCitation);
	await createSourceForm.getByLabel('Title').fill('Boundary pilot reference source');
	await createSourceForm.getByLabel('Source type').selectOption('literature');
	await createSourceForm.getByLabel('URL').fill('https://example.com/boundary-pilot');
	await createSourceForm.getByLabel('DOI').fill('10.0000/boundary-pilot');
	await createSourceForm.getByLabel('Publication year').fill('2026');
	await createSourceForm.getByLabel('Sample size').fill('12');
	await createSourceForm.getByLabel('Population').fill('Initial pilot participants');
	await createSourceForm.getByLabel('Notes').fill('Added during reference curation smoke test.');
	await createSourceForm.getByRole('button', { name: 'Add source' }).click();
	await expect(page.getByText('Reference source added.')).toBeVisible();

	const sourceForm = page.locator(`form[aria-label="Edit literature source ${sourceCitation}"]`);
	await expect(sourceForm).toBeVisible();
	await sourceForm.getByLabel('Population').fill('Boundary pilot participants');
	await sourceForm.getByLabel('Notes').fill('Source reviewed for reference curation smoke test.');
	await sourceForm.getByRole('button', { name: 'Save source' }).click();
	await expect(page.getByText('Reference source updated.')).toBeVisible();
	await expect(sourceForm.getByLabel('Population')).toHaveValue('Boundary pilot participants');

	const initialRevertButton = page.getByRole('button', { name: 'Revert to candidate' });
	if (await initialRevertButton.isVisible()) {
		await initialRevertButton.click();
		await expect(page.getByText('Reference dataset reverted to candidate.')).toBeVisible();
	}

	const datasetForm = page.locator('form[aria-label^="Edit reference dataset"]').first();
	await datasetForm.getByLabel('Literature source').selectOption({ label: sourceCitation });
	await datasetForm.getByLabel('Dataset status').selectOption('candidate');
	await datasetForm.locator('select[name="compatibility"]').selectOption('partial');
	await datasetForm.getByLabel('Sample size').fill('42');
	await datasetForm
		.getByLabel('Compatibility notes')
		.fill('Candidate details updated before review.');
	await datasetForm.getByRole('button', { name: 'Save dataset' }).click();
	await expect(page.getByText('Reference dataset updated.')).toBeVisible();
	await expect(page.getByRole('link', { name: sourceCitation }).first()).toBeVisible();
	await expect(datasetForm.getByLabel('Dataset status')).toHaveValue('candidate');
	await expect(datasetForm.getByLabel('Sample size')).toHaveValue('42');

	const cohortLabel = `Boundary Pilot Cohort ${Date.now()}`;
	const createCohortForm = page.locator('form[aria-label^="Add cohort for"]').first();
	await createCohortForm.getByLabel('Source').selectOption({ label: sourceCitation });
	await createCohortForm.getByLabel('Cohort label').fill(cohortLabel);
	await createCohortForm.getByLabel('Group label').fill('healthy controls');
	await createCohortForm.getByLabel('Sample size').fill('12');
	await createCohortForm.getByLabel('Population').fill('Boundary pilot participants');
	await createCohortForm.getByLabel('Inclusion criteria').fill('Completed pilot reference task');
	await createCohortForm.getByLabel('Exclusion criteria').fill('Invalid timing metadata');
	await createCohortForm.getByLabel('Cohort notes').fill('Cohort added during smoke test.');
	await createCohortForm.getByRole('button', { name: 'Add cohort' }).click();
	await expect(page.getByText('Reference cohort added.')).toBeVisible();

	const cohortForm = page.locator(`form[aria-label="Edit reference cohort ${cohortLabel}"]`);
	await expect(cohortForm).toBeVisible();
	await cohortForm.getByLabel('Cohort notes').fill('Cohort reviewed during smoke test.');
	await cohortForm.getByRole('button', { name: 'Save cohort' }).click();
	await expect(page.getByText('Reference cohort updated.')).toBeVisible();
	await expect(cohortForm.getByLabel('Cohort notes')).toHaveValue(
		'Cohort reviewed during smoke test.'
	);

	const mappingForm = page.locator('form[aria-label^="Edit reference mapping Accuracy"]').first();
	await mappingForm.getByLabel('Reference cohort').selectOption({ label: cohortLabel });
	await mappingForm.getByLabel('Source metric').fill('pilot_accuracy');
	await mappingForm.getByLabel('Source columns').fill('pilot_nont, pilot_targ');
	await mappingForm.getByLabel('Direction').selectOption('same');
	await mappingForm.getByLabel('Extraction status').selectOption('reviewed');
	await mappingForm
		.getByLabel('Transformation')
		.fill('Mean of pilot target and non-target accuracy.');
	await mappingForm.getByLabel('Mapping notes').fill('Mapping reviewed during smoke test.');
	await mappingForm.getByRole('button', { name: 'Save mapping' }).click();
	await expect(page.getByText('Reference metric mapping updated.')).toBeVisible();
	await expect(mappingForm.getByLabel('Source metric')).toHaveValue('pilot_accuracy');
	await expect(mappingForm.getByLabel('Source columns')).toHaveValue('pilot_nont, pilot_targ');
	await expect(page.getByRole('link', { name: 'Export JSON' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Export CSV' })).toBeVisible();

	const referenceJsonResponse = await page.request.get('/admin/references/export.json');
	expect(referenceJsonResponse.status()).toBe(200);
	const referenceJson = await referenceJsonResponse.json();
	const exportedDataset = referenceJson.datasets.find(
		(dataset: { id: string }) => dataset.id === 'openfmri-ds000115-nback'
	);
	expect(exportedDataset.cohorts.map((cohort: { label: string }) => cohort.label)).toContain(
		cohortLabel
	);
	const exportedAccuracy = exportedDataset.metrics.find(
		(metric: { metricKey: string }) => metric.metricKey === 'accuracy'
	);
	expect(exportedAccuracy.mapping).toMatchObject({
		sourceMetric: 'pilot_accuracy',
		sourceColumns: ['pilot_nont', 'pilot_targ'],
		extractionStatus: 'reviewed'
	});

	const referenceCsvResponse = await page.request.get('/admin/references/export.csv');
	expect(referenceCsvResponse.status()).toBe(200);
	const referenceCsv = await referenceCsvResponse.text();
	expect(referenceCsv).toContain('"mapping_source_metric"');
	expect(referenceCsv).toContain('"pilot_accuracy"');

	const validateForm = page.locator('form[aria-label^="Validate reference dataset"]').first();
	await validateForm.getByLabel('Review compatibility').selectOption('compatible');
	await validateForm
		.getByLabel('Validation notes')
		.fill('Validated imported participants.tsv summary for smoke-test review flow.');
	await validateForm.getByRole('button', { name: 'Mark validated' }).click();
	await expect(page.getByText('Reference dataset validated.')).toBeVisible();
	await expect(datasetForm.getByLabel('Dataset status')).toHaveValue('validated');

	const importedReferenceContextResponse = await page.request.post(
		'/api/reference-context/n-back',
		{
			data: {
				metrics: {
					accuracy: 0.83,
					sensitivityIndex: 1.2,
					falseAlarmRate: 0.1
				}
			}
		}
	);
	expect(importedReferenceContextResponse.status()).toBe(200);
	const importedReferenceContext = await importedReferenceContextResponse.json();
	const importedAccuracyComparison = importedReferenceContext.comparisons.find(
		(comparison: { metricKey: string }) => comparison.metricKey === 'accuracy'
	);
	expect(importedAccuracyComparison).toMatchObject({
		state: 'comparable',
		referenceSourceCitation: sourceCitation,
		referenceCohortLabel: cohortLabel,
		mappingSourceMetric: 'pilot_accuracy',
		mappingSourceColumns: ['pilot_nont', 'pilot_targ'],
		mappingExtractionStatus: 'reviewed',
		referenceMean: 0.8508194948622451,
		referenceStandardDeviation: 0.1884581684338786
	});
	expect(importedAccuracyComparison.zScore).toBeCloseTo(-0.11, 2);
	expect(importedReferenceContext.prompts).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				metricKey: 'accuracy',
				sourceCitation,
				sourceUrl: 'https://example.com/boundary-pilot'
			})
		])
	);
	const accuracyPrompt = importedReferenceContext.prompts.find(
		(prompt: { metricKey: string }) => prompt.metricKey === 'accuracy'
	);
	expect(accuracyPrompt.body).toContain(cohortLabel);
	expect(accuracyPrompt.caveat).toContain('not a diagnosis');
	expect(importedReferenceContext.recommendations).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				metricKey: 'accuracy',
				href: '/orientation-discrimination',
				sourceCitation,
				sourceUrl: 'https://example.com/boundary-pilot'
			})
		])
	);
	const accuracyRecommendation = importedReferenceContext.recommendations.find(
		(recommendation: { metricKey: string }) => recommendation.metricKey === 'accuracy'
	);
	expect(accuracyRecommendation.body).toContain(cohortLabel);
	expect(accuracyRecommendation.caveat).toContain('not a diagnosis');

	const metricForm = page.locator('form[aria-label^="Edit reference metric Accuracy"]').first();
	await metricForm.getByLabel('Mean').fill('0.72');
	await metricForm.getByLabel('SD').fill('0.11');
	await metricForm.getByLabel('Metric notes').fill('Accuracy extractable after event validation.');
	await metricForm.getByRole('button', { name: 'Save metric' }).click();
	await expect(page.getByText('Reference metric updated.')).toBeVisible();
	await expect(metricForm.getByLabel('Mean')).toHaveValue('0.72');
	await expect(metricForm.getByLabel('Metric notes')).toHaveValue(
		'Accuracy extractable after event validation.'
	);

	const referenceContextResponse = await page.request.post('/api/reference-context/n-back', {
		data: {
			metrics: {
				accuracy: 0.83,
				sensitivityIndex: 1.2,
				falseAlarmRate: 0.1
			}
		}
	});
	expect(referenceContextResponse.status()).toBe(200);
	const referenceContext = await referenceContextResponse.json();
	const accuracyComparison = referenceContext.comparisons.find(
		(comparison: { metricKey: string }) => comparison.metricKey === 'accuracy'
	);
	expect(accuracyComparison).toMatchObject({
		state: 'comparable',
		referenceMean: 0.72,
		referenceStandardDeviation: 0.11
	});
	expect(accuracyComparison.zScore).toBeCloseTo(1);
	expect(accuracyComparison.summary).toContain('above the reference mean');

	await page.getByRole('button', { name: 'Revert to candidate' }).click();
	await expect(page.getByText('Reference dataset reverted to candidate.')).toBeVisible();
	const revertedReferenceContextResponse = await page.request.post(
		'/api/reference-context/n-back',
		{
			data: {
				metrics: {
					accuracy: 0.83,
					sensitivityIndex: 1.2,
					falseAlarmRate: 0.1
				}
			}
		}
	);
	expect(revertedReferenceContextResponse.status()).toBe(200);
	const revertedReferenceContext = await revertedReferenceContextResponse.json();
	const revertedAccuracyComparison = revertedReferenceContext.comparisons.find(
		(comparison: { metricKey: string }) => comparison.metricKey === 'accuracy'
	);
	expect(revertedAccuracyComparison).toMatchObject({
		state: 'candidate_only',
		zScore: null
	});
	await page.goto('/admin');

	const csvResponse = await page.request.get('/admin/tipi/export.csv');
	expect(csvResponse.status()).toBe(200);
	expect(await csvResponse.text()).toContain('run_id,participant_session_id,status');

	const jsonResponse = await page.request.get('/admin/tipi/export.json');
	expect(jsonResponse.status()).toBe(200);
	const jsonExport = await jsonResponse.json();
	expect(jsonExport).toMatchObject({ runs: expect.any(Array) });
	expect(jsonExport.runs[0].genericResponses).toHaveLength(10);
	expect(jsonExport.runs[0].events.map((event: { eventType: string }) => event.eventType)).toEqual(
		expect.arrayContaining(['run_started', 'trial_started', 'response_submitted', 'run_completed'])
	);

	const genericCsvResponse = await page.request.get('/admin/experiments/export.csv');
	expect(genericCsvResponse.status()).toBe(200);
	expect(await genericCsvResponse.text()).toContain('response_time_ms');

	await page.getByRole('link', { name: 'Analysis', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Analysis' })).toBeVisible();
	await expect(page.getByText('Total participants')).toBeVisible();
	await expect(page.getByText('Completion rate')).toBeVisible();
	await expect(page.getByText('Median response time')).toBeVisible();
	await expect(
		page.getByRole('cell', { name: 'Ten Item Personality Inventory' }).first()
	).toBeVisible();
	await expect(page.getByText('TIPI trait means').first()).toBeVisible();

	const analysisCsvResponse = await page.request.get('/admin/analysis/export.csv');
	expect(analysisCsvResponse.status()).toBe(200);
	expect(await analysisCsvResponse.text()).toContain(
		'"experiment_slug","experiment_name","total_runs"'
	);

	await page.getByRole('link', { name: 'Participant sessions' }).click();
	await expect(page.getByRole('heading', { name: 'Participants' })).toBeVisible();
	await expect(page.getByText('Visible sessions')).toBeVisible();
	await expect(page.locator('p', { hasText: 'Consented' }).first()).toBeVisible();
	await expect(page.getByRole('link', { name: /View participant/ }).first()).toBeVisible();
	await page
		.getByRole('link', { name: /View participant/ })
		.first()
		.click();
	await expect(page.getByRole('heading', { name: 'Participant detail' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Run history' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Consents' })).toBeVisible();
	const reviewForm = page.locator('form[aria-label^="Review run"]').first();
	const reviewedRunId = await reviewForm.locator('input[name="runId"]').inputValue();
	const reviewedRunLabel = `View run ${reviewedRunId.slice(0, 8)}`;
	await reviewForm.getByLabel('Review status').selectOption('excluded');
	await reviewForm.getByLabel('Review reason').selectOption('test_data');
	await reviewForm.getByLabel('Review note').fill('Playwright exclusion check');
	await reviewForm.getByRole('button', { name: 'Save review' }).click();
	await expect(reviewForm.getByLabel('Review status')).toHaveValue('excluded');
	await expect(page.getByText('excluded (test data)').first()).toBeVisible();

	const excludedAnalysisCsvResponse = await page.request.get(
		'/admin/analysis/export.csv?review=excluded'
	);
	expect(excludedAnalysisCsvResponse.status()).toBe(200);
	expect(await excludedAnalysisCsvResponse.text()).toContain('"excluded"');

	await page.goto('/admin/review?scope=all');
	await expect(page.getByRole('heading', { name: 'Review queue' })).toBeVisible();
	await expect(
		page.getByRole('paragraph').filter({ hasText: 'Needs action' }).first()
	).toBeVisible();
	const queueRow = page.getByRole('row').filter({ hasText: reviewedRunLabel });
	await expect(queueRow).toContainText('excluded (test data)');
	const queueForm = queueRow.locator('form[aria-label^="Review queue run"]');
	await queueForm.getByLabel('Review status').selectOption('review');
	await queueForm.getByLabel('Review reason').selectOption('technical_issue');
	await queueForm.getByLabel('Review note').fill('Queue review check');
	await queueForm.getByRole('button', { name: 'Save review' }).click();
	const updatedQueueRow = page.getByRole('row').filter({ hasText: reviewedRunLabel });
	await expect(updatedQueueRow).toContainText('review (technical issue)');

	const reviewAnalysisCsvResponse = await page.request.get(
		'/admin/analysis/export.csv?review=review'
	);
	expect(reviewAnalysisCsvResponse.status()).toBe(200);
	expect(await reviewAnalysisCsvResponse.text()).toContain('"review"');

	await updatedQueueRow.getByRole('link', { name: /View run/ }).click();
	await expect(page.getByRole('heading', { name: 'Run detail' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Review status' })).toBeVisible();
	await expect(page.getByRole('link', { name: /[0-9a-f-]{36}/ }).first()).toBeVisible();

	await page.goto('/admin');
	await page
		.getByRole('link', { name: /View run/ })
		.first()
		.click();
	await expect(page.getByRole('heading', { name: 'Run detail' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Responses' })).toBeVisible();
	await expect(page.getByText('Agree a little').first()).toBeVisible();
});
