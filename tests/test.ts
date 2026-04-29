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
	orientationSummary?: { totalTrials: number; correctCount: number } | null;
	nBackSummary?: { totalTrials: number; correctCount: number } | null;
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
}

async function completeIntertemporalRun(page: Page) {
	await page.goto('/intertemporal-choice');
	await acceptConsentAndStart(page);

	for (let trial = 1; trial <= 8; trial++) {
		await expect(page.getByText(`${trial} of 8`)).toBeVisible();
		await page.getByRole('button', { name: 'Choose later option' }).click();
	}

	await expect(page.getByRole('heading', { name: 'Intertemporal choice complete' })).toBeVisible();
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
}

async function completeNBackRun(page: Page) {
	await page.goto('/n-back');
	await acceptConsentAndStart(page);

	for (let trial = 1; trial <= 16; trial++) {
		await expect(page.getByText(`${trial} of 16`)).toBeVisible();
		await page.getByRole('button', { name: 'Choose no match' }).click();
	}

	await expect(page.getByRole('heading', { name: 'n-back complete' })).toBeVisible();
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
			run.orientationSummary?.totalTrials === 16
	);

	expect(orientationRun).toBeTruthy();
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
			run.nBackSummary?.totalTrials === 16
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
	await expect(page.getByRole('link', { name: 'Analysis' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Participants' })).toBeVisible();

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

	await page.getByRole('link', { name: 'Analysis' }).click();
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
