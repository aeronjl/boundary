import { fail, redirect } from '@sveltejs/kit';
import { isAdminAuthenticated } from '$lib/server/admin/auth';
import {
	createAdminReferenceCohort,
	createAdminReferenceStudy,
	listAdminReferenceRegistry,
	setAdminReferenceCohort,
	setAdminReferenceDataset,
	setAdminReferenceMetric,
	setAdminReferenceMetricMapping,
	setAdminReferenceReviewStatus,
	setAdminReferenceStudy
} from '$lib/server/admin/references';
import type { Actions, PageServerLoad } from './$types';

function updateMessage(value: string | null): string {
	if (value === 'dataset') return 'Reference dataset updated.';
	if (value === 'metric') return 'Reference metric updated.';
	if (value === 'mapping') return 'Reference metric mapping updated.';
	if (value === 'cohort') return 'Reference cohort updated.';
	if (value === 'cohort-created') return 'Reference cohort added.';
	if (value === 'study') return 'Reference source updated.';
	if (value === 'study-created') return 'Reference source added.';
	if (value === 'validated') return 'Reference dataset validated.';
	if (value === 'candidate') return 'Reference dataset reverted to candidate.';
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
			referenceStudyId:
				typeof form.get('referenceStudyId') === 'string'
					? String(form.get('referenceStudyId'))
					: null,
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
	createCohort: async ({ cookies, request }) => {
		if (!isAdminAuthenticated(cookies)) {
			throw redirect(303, '/admin');
		}

		const form = await request.formData();
		const referenceDatasetId = form.get('referenceDatasetId');

		if (typeof referenceDatasetId !== 'string' || referenceDatasetId.length === 0) {
			return fail(400, { message: 'Reference dataset id is required.' });
		}

		const result = await createAdminReferenceCohort({
			referenceDatasetId,
			referenceStudyId:
				typeof form.get('referenceStudyId') === 'string'
					? String(form.get('referenceStudyId'))
					: null,
			label: typeof form.get('label') === 'string' ? String(form.get('label')) : null,
			population:
				typeof form.get('population') === 'string' ? String(form.get('population')) : null,
			groupLabel:
				typeof form.get('groupLabel') === 'string' ? String(form.get('groupLabel')) : null,
			sampleSize:
				typeof form.get('sampleSize') === 'string' ? String(form.get('sampleSize')) : null,
			inclusionCriteria:
				typeof form.get('inclusionCriteria') === 'string'
					? String(form.get('inclusionCriteria'))
					: null,
			exclusionCriteria:
				typeof form.get('exclusionCriteria') === 'string'
					? String(form.get('exclusionCriteria'))
					: null,
			notes: typeof form.get('notes') === 'string' ? String(form.get('notes')) : null
		});

		if (!result.ok) {
			return fail(result.status, { message: result.message });
		}

		throw redirect(303, '/admin/references?updated=cohort-created');
	},
	cohort: async ({ cookies, request }) => {
		if (!isAdminAuthenticated(cookies)) {
			throw redirect(303, '/admin');
		}

		const form = await request.formData();
		const id = form.get('cohortId');
		const referenceDatasetId = form.get('referenceDatasetId');

		if (typeof id !== 'string' || id.length === 0) {
			return fail(400, { message: 'Reference cohort id is required.' });
		}

		if (typeof referenceDatasetId !== 'string' || referenceDatasetId.length === 0) {
			return fail(400, { message: 'Reference dataset id is required.' });
		}

		const result = await setAdminReferenceCohort({
			id,
			referenceDatasetId,
			referenceStudyId:
				typeof form.get('referenceStudyId') === 'string'
					? String(form.get('referenceStudyId'))
					: null,
			label: typeof form.get('label') === 'string' ? String(form.get('label')) : null,
			population:
				typeof form.get('population') === 'string' ? String(form.get('population')) : null,
			groupLabel:
				typeof form.get('groupLabel') === 'string' ? String(form.get('groupLabel')) : null,
			sampleSize:
				typeof form.get('sampleSize') === 'string' ? String(form.get('sampleSize')) : null,
			inclusionCriteria:
				typeof form.get('inclusionCriteria') === 'string'
					? String(form.get('inclusionCriteria'))
					: null,
			exclusionCriteria:
				typeof form.get('exclusionCriteria') === 'string'
					? String(form.get('exclusionCriteria'))
					: null,
			notes: typeof form.get('notes') === 'string' ? String(form.get('notes')) : null
		});

		if (!result.ok) {
			return fail(result.status, { message: result.message });
		}

		throw redirect(303, '/admin/references?updated=cohort');
	},
	createStudy: async ({ cookies, request }) => {
		if (!isAdminAuthenticated(cookies)) {
			throw redirect(303, '/admin');
		}

		const form = await request.formData();
		const result = await createAdminReferenceStudy({
			shortCitation:
				typeof form.get('shortCitation') === 'string' ? String(form.get('shortCitation')) : null,
			title: typeof form.get('title') === 'string' ? String(form.get('title')) : null,
			url: typeof form.get('url') === 'string' ? String(form.get('url')) : null,
			doi: typeof form.get('doi') === 'string' ? String(form.get('doi')) : null,
			publicationYear:
				typeof form.get('publicationYear') === 'string'
					? String(form.get('publicationYear'))
					: null,
			sourceType: String(form.get('sourceType') ?? ''),
			population:
				typeof form.get('population') === 'string' ? String(form.get('population')) : null,
			sampleSize:
				typeof form.get('sampleSize') === 'string' ? String(form.get('sampleSize')) : null,
			notes: typeof form.get('notes') === 'string' ? String(form.get('notes')) : null
		});

		if (!result.ok) {
			return fail(result.status, { message: result.message });
		}

		throw redirect(303, '/admin/references?updated=study-created');
	},
	study: async ({ cookies, request }) => {
		if (!isAdminAuthenticated(cookies)) {
			throw redirect(303, '/admin');
		}

		const form = await request.formData();
		const id = form.get('studyId');

		if (typeof id !== 'string' || id.length === 0) {
			return fail(400, { message: 'Reference source id is required.' });
		}

		const result = await setAdminReferenceStudy({
			id,
			shortCitation:
				typeof form.get('shortCitation') === 'string' ? String(form.get('shortCitation')) : null,
			title: typeof form.get('title') === 'string' ? String(form.get('title')) : null,
			url: typeof form.get('url') === 'string' ? String(form.get('url')) : null,
			doi: typeof form.get('doi') === 'string' ? String(form.get('doi')) : null,
			publicationYear:
				typeof form.get('publicationYear') === 'string'
					? String(form.get('publicationYear'))
					: null,
			sourceType: String(form.get('sourceType') ?? ''),
			population:
				typeof form.get('population') === 'string' ? String(form.get('population')) : null,
			sampleSize:
				typeof form.get('sampleSize') === 'string' ? String(form.get('sampleSize')) : null,
			notes: typeof form.get('notes') === 'string' ? String(form.get('notes')) : null
		});

		if (!result.ok) {
			return fail(result.status, { message: result.message });
		}

		throw redirect(303, '/admin/references?updated=study');
	},
	review: async ({ cookies, request }) => {
		if (!isAdminAuthenticated(cookies)) {
			throw redirect(303, '/admin');
		}

		const form = await request.formData();
		const id = form.get('datasetId');

		if (typeof id !== 'string' || id.length === 0) {
			return fail(400, { message: 'Reference dataset id is required.' });
		}

		const nextStatus = String(form.get('status') ?? '');
		const result = await setAdminReferenceReviewStatus({
			id,
			status: nextStatus,
			compatibility: String(form.get('compatibility') ?? ''),
			notes: typeof form.get('notes') === 'string' ? String(form.get('notes')) : null
		});

		if (!result.ok) {
			return fail(result.status, { message: result.message });
		}

		const updated = nextStatus === 'validated' ? 'validated' : 'candidate';
		throw redirect(303, `/admin/references?updated=${updated}`);
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
	},
	mapping: async ({ cookies, request }) => {
		if (!isAdminAuthenticated(cookies)) {
			throw redirect(303, '/admin');
		}

		const form = await request.formData();
		const referenceMetricId = form.get('metricId');

		if (typeof referenceMetricId !== 'string' || referenceMetricId.length === 0) {
			return fail(400, { message: 'Reference metric id is required.' });
		}

		const result = await setAdminReferenceMetricMapping({
			id: typeof form.get('mappingId') === 'string' ? String(form.get('mappingId')) : null,
			referenceMetricId,
			referenceCohortId:
				typeof form.get('referenceCohortId') === 'string'
					? String(form.get('referenceCohortId'))
					: null,
			sourceMetric:
				typeof form.get('sourceMetric') === 'string' ? String(form.get('sourceMetric')) : null,
			sourceColumns:
				typeof form.get('sourceColumns') === 'string' ? String(form.get('sourceColumns')) : null,
			transformation:
				typeof form.get('transformation') === 'string' ? String(form.get('transformation')) : null,
			direction: String(form.get('direction') ?? ''),
			extractionStatus: String(form.get('extractionStatus') ?? ''),
			notes: typeof form.get('notes') === 'string' ? String(form.get('notes')) : null
		});

		if (!result.ok) {
			return fail(result.status, { message: result.message });
		}

		throw redirect(303, '/admin/references?updated=mapping');
	}
};
