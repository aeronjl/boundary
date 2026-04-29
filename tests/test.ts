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
	experimentVersionId: string;
	responses: GenericExportResponse[];
	events: { eventType: string }[];
	intertemporalSummary?: { delayedChoiceCount: number } | null;
	orientationSummary?: { totalTrials: number; correctCount: number } | null;
	nBackSummary?: { totalTrials: number; correctCount: number } | null;
};

async function completeTipiRun(page: Page) {
	await page.goto('/ten-item-personality-inventory');
	await page.getByRole('button', { name: 'Start' }).click();

	for (let trial = 1; trial <= 10; trial++) {
		await expect(page.getByText(`Question ${trial} of 10`)).toBeVisible();
		await page.getByRole('radio', { name: 'Agree a little', exact: true }).check();
		await page.getByRole('button', { name: 'Submit' }).click();
	}

	await expect(page.getByText('You have completed the inventory.')).toBeVisible();
}

async function completeBanditRun(page: Page) {
	await page.goto('/n-armed-bandit');
	await page.getByRole('button', { name: 'Start' }).click();

	for (let trial = 1; trial <= 20; trial++) {
		await expect(page.getByText(`Trial ${trial} of 20`)).toBeVisible();
		await page.getByRole('button', { name: 'Choose arm A' }).click();
	}

	await expect(page.getByRole('heading', { name: 'Bandit run complete' })).toBeVisible();
}

async function completeIntertemporalRun(page: Page) {
	await page.goto('/intertemporal-choice');
	await page.getByRole('button', { name: 'Start' }).click();

	for (let trial = 1; trial <= 8; trial++) {
		await expect(page.getByText(`${trial} of 8`)).toBeVisible();
		await page.getByRole('button', { name: 'Choose later option' }).click();
	}

	await expect(page.getByRole('heading', { name: 'Intertemporal choice complete' })).toBeVisible();
}

async function completeOrientationRun(page: Page) {
	await page.goto('/orientation-discrimination');
	await page.getByRole('button', { name: 'Start' }).click();

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
	await page.getByRole('button', { name: 'Start' }).click();

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

test('ten item personality inventory records and displays results', async ({ page }) => {
	await completeTipiRun(page);
	await page.getByRole('button', { name: 'Results' }).click();
	await expect(page.getByText('Extroversion')).toBeVisible();
	await expect(page.getByText('/ 7').first()).toBeVisible();
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
	await expect(page.getByText('Ten Item Personality Inventory data')).toBeVisible();
	await expect(page.getByRole('link', { name: 'CSV export' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'JSON export' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'All experiment JSON' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'All experiment CSV' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Experiment runs' })).toBeVisible();

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

	await page
		.getByRole('link', { name: /View run/ })
		.first()
		.click();
	await expect(page.getByRole('heading', { name: 'Run detail' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Responses' })).toBeVisible();
	await expect(page.getByText('Agree a little').first()).toBeVisible();
});
