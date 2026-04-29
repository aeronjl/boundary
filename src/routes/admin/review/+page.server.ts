import { fail, redirect } from '@sveltejs/kit';
import { isAdminAuthenticated } from '$lib/server/admin/auth';
import {
	listAdminReviewQueue,
	parseAdminReviewQueueFilters,
	setAdminRunReview
} from '$lib/server/admin/reviews';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, url }) => {
	if (!isAdminAuthenticated(cookies)) {
		throw redirect(303, '/admin');
	}

	return {
		...(await listAdminReviewQueue(parseAdminReviewQueueFilters(url.searchParams))),
		returnTo: `${url.pathname}${url.search}`
	};
};

export const actions: Actions = {
	review: async ({ cookies, request }) => {
		if (!isAdminAuthenticated(cookies)) {
			throw redirect(303, '/admin');
		}

		const form = await request.formData();
		const runId = form.get('runId');
		const returnTo = String(form.get('returnTo') ?? '/admin/review');

		if (typeof runId !== 'string' || runId.length === 0) {
			return fail(400, { message: 'Run id is required.' });
		}

		const review = await setAdminRunReview(runId, {
			status: String(form.get('status') ?? ''),
			reason: String(form.get('reason') ?? ''),
			note: String(form.get('note') ?? '')
		});

		if (!review) {
			return fail(404, { message: 'Experiment run not found.' });
		}

		throw redirect(303, returnTo.startsWith('/admin/review') ? returnTo : '/admin/review');
	}
};
