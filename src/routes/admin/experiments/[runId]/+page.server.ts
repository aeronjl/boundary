import { error, fail, redirect } from '@sveltejs/kit';
import { isAdminAuthenticated } from '$lib/server/admin/auth';
import { getAdminExperimentRun } from '$lib/server/admin/experiments';
import { setAdminRunReview } from '$lib/server/admin/reviews';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, params }) => {
	if (!isAdminAuthenticated(cookies)) {
		throw redirect(303, '/admin');
	}

	const run = await getAdminExperimentRun(params.runId);

	if (!run) {
		throw error(404, 'Experiment run not found.');
	}

	return { run };
};

export const actions: Actions = {
	review: async ({ cookies, params, request }) => {
		if (!isAdminAuthenticated(cookies)) {
			throw redirect(303, '/admin');
		}

		const form = await request.formData();
		const review = await setAdminRunReview(params.runId, {
			status: String(form.get('status') ?? ''),
			reason: String(form.get('reason') ?? ''),
			note: String(form.get('note') ?? '')
		});

		if (!review) {
			return fail(404, { message: 'Experiment run not found.' });
		}

		throw redirect(303, `/admin/experiments/${params.runId}`);
	}
};
