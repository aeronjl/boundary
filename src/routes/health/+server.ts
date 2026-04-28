import { json } from '@sveltejs/kit';
import { client, isRemoteDatabase } from '$lib/server/db';
import type { RequestHandler } from './$types';

const headers = {
	'cache-control': 'no-store'
};

export const GET: RequestHandler = async () => {
	const checkedAt = new Date().toISOString();

	try {
		await client.execute('SELECT 1');

		return json(
			{
				ok: true,
				checkedAt,
				database: {
					ok: true,
					remote: isRemoteDatabase
				}
			},
			{ headers }
		);
	} catch (error) {
		console.error('Health check failed.', error);

		return json(
			{
				ok: false,
				checkedAt,
				database: {
					ok: false,
					remote: isRemoteDatabase
				}
			},
			{ status: 503, headers }
		);
	}
};
