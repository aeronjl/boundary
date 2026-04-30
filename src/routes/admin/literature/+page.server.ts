import { fail, redirect } from '@sveltejs/kit';
import { isAdminAuthenticated } from '$lib/server/admin/auth';
import {
	getAdminLiteratureExtractionExport,
	setAdminLiteratureClaimReview
} from '$lib/server/admin/literature';
import type { Actions, PageServerLoad } from './$types';

function updateMessage(value: string | null): string {
	if (value === 'claim-public') return 'Literature claim promoted to public-ready.';
	if (value === 'claim-internal') return 'Literature claim moved to internal review.';
	return '';
}

export const load: PageServerLoad = async ({ cookies, url }) => {
	if (!isAdminAuthenticated(cookies)) {
		throw redirect(303, '/admin');
	}

	return {
		...(await getAdminLiteratureExtractionExport()),
		message: updateMessage(url.searchParams.get('updated'))
	};
};

export const actions: Actions = {
	claimReview: async ({ cookies, request }) => {
		if (!isAdminAuthenticated(cookies)) {
			throw redirect(303, '/admin');
		}

		const form = await request.formData();
		const claimId = form.get('claimId');

		if (typeof claimId !== 'string' || claimId.length === 0) {
			return fail(400, { message: 'Literature claim id is required.' });
		}

		const participantUse = String(form.get('participantUse') ?? '');
		const result = await setAdminLiteratureClaimReview({
			claimId,
			status: String(form.get('status') ?? ''),
			participantUse
		});

		if (!result.ok) {
			return fail(result.status, { message: result.message });
		}

		const updated = participantUse === 'public_prompt_ready' ? 'claim-public' : 'claim-internal';
		throw redirect(303, `/admin/literature?updated=${updated}`);
	}
};
