import { fail, redirect } from '@sveltejs/kit';
import { isAdminAuthenticated } from '$lib/server/admin/auth';
import {
	listAdminReferenceRegistry,
	setAdminReferenceDataset,
	setAdminReferenceMetric
} from '$lib/server/admin/references';
import type { Actions, PageServerLoad } from './$types';

function updateMessage(value: string | null): string {
	if (value === 'dataset') return 'Reference dataset updated.';
	if (value === 'metric') return 'Reference metric updated.';
	return '';
}

export const load: PageServerLoad = async ({ cookies, url }) => {
	if (!isAdminAuthenticated(cookies)) {
		throw redirect(303, '/admin');
	}

	return {
		...(await listAdminReferenceRegistry()),
		message: updateMessage(url.searchParams.get('updated'))
	};
};

export const actions: Actions = {
	dataset: async ({ cookies, request }) => {
		if (!isAdminAuthenticated(cookies)) {
			throw redirect(303, '/admin');
		}

		const form = await request.formData();
		const id = form.get('datasetId');

		if (typeof id !== 'string' || id.length === 0) {
			return fail(400, { message: 'Reference dataset id is required.' });
		}

		const result = await setAdminReferenceDataset({
			id,
			status: String(form.get('status') ?? ''),
			compatibility: String(form.get('compatibility') ?? ''),
			sampleSize:
				typeof form.get('sampleSize') === 'string' ? String(form.get('sampleSize')) : null,
			license: typeof form.get('license') === 'string' ? String(form.get('license')) : null,
			population:
				typeof form.get('population') === 'string' ? String(form.get('population')) : null,
			taskVariant:
				typeof form.get('taskVariant') === 'string' ? String(form.get('taskVariant')) : null,
			notes: typeof form.get('notes') === 'string' ? String(form.get('notes')) : null
		});

		if (!result.ok) {
			return fail(result.status, { message: result.message });
		}

		throw redirect(303, '/admin/references?updated=dataset');
	},
	metric: async ({ cookies, request }) => {
		if (!isAdminAuthenticated(cookies)) {
			throw redirect(303, '/admin');
		}

		const form = await request.formData();
		const id = form.get('metricId');

		if (typeof id !== 'string' || id.length === 0) {
			return fail(400, { message: 'Reference metric id is required.' });
		}

		const result = await setAdminReferenceMetric({
			id,
			mean: typeof form.get('mean') === 'string' ? String(form.get('mean')) : null,
			standardDeviation:
				typeof form.get('standardDeviation') === 'string'
					? String(form.get('standardDeviation'))
					: null,
			minimum: typeof form.get('minimum') === 'string' ? String(form.get('minimum')) : null,
			maximum: typeof form.get('maximum') === 'string' ? String(form.get('maximum')) : null,
			notes: typeof form.get('notes') === 'string' ? String(form.get('notes')) : null
		});

		if (!result.ok) {
			return fail(result.status, { message: result.message });
		}

		throw redirect(303, '/admin/references?updated=metric');
	}
};
