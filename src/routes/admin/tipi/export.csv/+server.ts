import { error, type RequestHandler } from '@sveltejs/kit';
import { tipiScales } from '$lib/experiments/tipi';
import { isAdminAuthenticated } from '$lib/server/admin/auth';
import { getTipiAdminExport } from '$lib/server/admin/tipi';

const headers = [
	'run_id',
	'participant_session_id',
	'status',
	'started_at',
	'completed_at',
	'generic_response_count',
	'event_count',
	'trial_index',
	'item_number',
	'question_id',
	'prompt',
	'scale',
	'scoring',
	'response',
	'score',
	'response_created_at',
	...tipiScales.flatMap((scale) => [`${scale}_raw`, `${scale}_average`])
];

function csvCell(value: number | string | null | undefined): string {
	if (value === null || value === undefined) return '';

	const text = String(value);
	return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export const GET: RequestHandler = async ({ cookies }) => {
	if (!isAdminAuthenticated(cookies)) {
		throw error(401, 'Admin token required.');
	}

	const data = await getTipiAdminExport();
	const lines = [headers.map(csvCell).join(',')];

	for (const run of data.runs) {
		if (run.responses.length === 0) {
			lines.push(
				headers
					.map((header) => {
						if (header === 'run_id') return csvCell(run.id);
						if (header === 'participant_session_id') return csvCell(run.participantSessionId);
						if (header === 'status') return csvCell(run.status);
						if (header === 'started_at') return csvCell(new Date(run.startedAt).toISOString());
						if (header === 'completed_at') {
							return csvCell(run.completedAt ? new Date(run.completedAt).toISOString() : null);
						}
						if (header === 'generic_response_count') return csvCell(run.genericResponseCount);
						if (header === 'event_count') return csvCell(run.eventCount);
						return csvCell(null);
					})
					.join(',')
			);
			continue;
		}

		for (const response of run.responses) {
			lines.push(
				[
					run.id,
					run.participantSessionId,
					run.status,
					new Date(run.startedAt).toISOString(),
					run.completedAt ? new Date(run.completedAt).toISOString() : null,
					run.genericResponseCount,
					run.eventCount,
					response.trialIndex,
					response.itemNumber,
					response.questionId,
					response.prompt,
					response.scale,
					response.scoring,
					response.response,
					response.score,
					new Date(response.createdAt).toISOString(),
					...tipiScales.flatMap((scale) => [run.scores[scale].raw, run.scores[scale].average])
				]
					.map(csvCell)
					.join(',')
			);
		}
	}

	return new Response(`${lines.join('\n')}\n`, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': 'attachment; filename="tipi-export.csv"'
		}
	});
};
