import { json } from '@sveltejs/kit';
import { getReferenceComparisonContext } from '$lib/server/reference-data/comparisons';
import type { RequestHandler } from './$types';

type ParsedMetrics = Record<string, number | null>;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseMetrics(payload: unknown): ParsedMetrics | null {
	if (!isRecord(payload) || !isRecord(payload.metrics)) return null;

	const metrics: ParsedMetrics = {};
	for (const [key, value] of Object.entries(payload.metrics)) {
		if (value === null) {
			metrics[key] = null;
			continue;
		}

		if (typeof value === 'number' && Number.isFinite(value)) {
			metrics[key] = value;
			continue;
		}

		return null;
	}

	return metrics;
}

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const metrics = parseMetrics(await request.json());
		if (!metrics) {
			return json(
				{ message: 'Expected metrics to be an object of finite numbers or null.' },
				{ status: 400 }
			);
		}

		const context = await getReferenceComparisonContext(params.experimentSlug, metrics);
		return json(context, {
			headers: {
				'cache-control': 'no-store'
			}
		});
	} catch (error) {
		console.error(error);
		return json({ message: 'Could not load reference context.' }, { status: 500 });
	}
};
