import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

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

test('admin can inspect and export ten item personality inventory data', async ({ page }) => {
	await completeTipiRun(page);

	await page.goto('/admin');
	await page.getByLabel('Admin token').fill('test-admin-token');
	await page.getByRole('button', { name: 'Sign in' }).click();

	await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible();
	await expect(page.getByText('Ten Item Personality Inventory data')).toBeVisible();
	await expect(page.getByRole('link', { name: 'CSV export' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'JSON export' })).toBeVisible();

	const csvResponse = await page.request.get('/admin/tipi/export.csv');
	expect(csvResponse.status()).toBe(200);
	expect(await csvResponse.text()).toContain('run_id,participant_session_id,status');

	const jsonResponse = await page.request.get('/admin/tipi/export.json');
	expect(jsonResponse.status()).toBe(200);
	expect(await jsonResponse.json()).toMatchObject({ runs: expect.any(Array) });

	await page
		.getByRole('link', { name: /View run/ })
		.first()
		.click();
	await expect(page.getByRole('heading', { name: 'Run detail' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Responses' })).toBeVisible();
	await expect(page.getByText('Agree a little').first()).toBeVisible();
});
