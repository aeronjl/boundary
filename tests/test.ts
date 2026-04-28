import { expect, test } from '@playwright/test';

test('index page has expected h1', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Boundary' })).toBeVisible();
});

test('ten item personality inventory records and displays results', async ({ page }) => {
	await page.goto('/ten-item-personality-inventory');
	await page.getByRole('button', { name: 'Start' }).click();

	for (let trial = 1; trial <= 10; trial++) {
		await expect(page.getByText(`Question ${trial} of 10`)).toBeVisible();
		await page.getByRole('radio', { name: 'Agree a little', exact: true }).check();
		await page.getByRole('button', { name: 'Submit' }).click();
	}

	await expect(page.getByText('You have completed the inventory.')).toBeVisible();
	await page.getByRole('button', { name: 'Results' }).click();
	await expect(page.getByText('Extroversion')).toBeVisible();
	await expect(page.getByText('/ 7').first()).toBeVisible();
});
