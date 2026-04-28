import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/libsql/web';
import * as schema from './schema';

const databaseAuthToken = process.env.TURSO_AUTH_TOKEN ?? process.env.DATABASE_AUTH_TOKEN;
const localDatabasePath = process.env.DB_FILE_NAME ?? 'data/boundary.sqlite';
const configuredDatabaseUrl = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL;

const hasProtocol = (value: string) => /^[a-z][a-z0-9+.-]*:/i.test(value);
const toLocalFileUrl = (value: string) => (hasProtocol(value) ? value : `file:${value}`);
const localLibsqlClientPackage = ['@libsql/client', 'node'].join('/');

export const databaseUrl = configuredDatabaseUrl ?? toLocalFileUrl(localDatabasePath);
export const isRemoteDatabase = !databaseUrl.startsWith('file:') && databaseUrl !== ':memory:';

if (process.env.VERCEL && !configuredDatabaseUrl) {
	throw new Error('Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN for Vercel deployments.');
}

const localFilePath = (url: string) => {
	if (!url.startsWith('file:')) return null;

	const rawPath = url.slice('file:'.length);
	if (!rawPath || rawPath === ':memory:') return null;

	return rawPath.startsWith('//') ? fileURLToPath(url) : rawPath;
};

const localPath = localFilePath(databaseUrl);
if (localPath) {
	mkdirSync(dirname(localPath), { recursive: true });
}

const createClient = isRemoteDatabase
	? (await import('@libsql/client/web')).createClient
	: (await import(/* @vite-ignore */ localLibsqlClientPackage)).createClient;

export const client = createClient({
	url: databaseUrl,
	authToken: databaseAuthToken
});

if (!isRemoteDatabase) {
	await client.execute('PRAGMA foreign_keys = ON;');
	await client.execute('PRAGMA journal_mode = WAL;');
}

export const db = drizzle(client, { schema });

export const closeDatabase = async () => {
	client.close();
};
