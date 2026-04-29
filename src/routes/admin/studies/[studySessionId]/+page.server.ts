import { error, fail, redirect } from '@sveltejs/kit';
import { isAdminAuthenticated } from '$lib/server/admin/auth';
import {
	adminStudyReviewReasons,
	adminStudyReviewStatuses,
	getAdminStudySessionDetail,
	setAdminStudyReview
} from '$lib/server/admin/studies';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, params }) => {
	if (!isAdminAuthenticated(cookies)) {
		throw redirect(303, '/admin');
	}

	const study = await getAdminStudySessionDetail(params.studySessionId);

	if (!study) {
		throw error(404, 'Study session not found.');
	}

	return {
		study,
		reviewStatuses: adminStudyReviewStatuses,
		reviewReasons: adminStudyReviewReasons
	};
};

export const actions: Actions = {
	review: async ({ cookies, params, request }) => {
		if (!isAdminAuthenticated(cookies)) {
			throw redirect(303, '/admin');
		}

		const form = await request.formData();
		const review = await setAdminStudyReview(params.studySessionId, {
			status: String(form.get('status') ?? ''),
			reason: String(form.get('reason') ?? ''),
			note: String(form.get('note') ?? '')
		});

		if (!review) {
			return fail(404, { message: 'Study session not found.' });
		}

		throw redirect(303, `/admin/studies/${params.studySessionId}`);
	}
};
