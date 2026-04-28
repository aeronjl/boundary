import { defineConfig } from 'drizzle-kit';

const tursoDatabaseUrl = process.env.TURSO_DATABASE_URL;

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: tursoDatabaseUrl ? 'turso' : 'sqlite',
	dbCredentials: tursoDatabaseUrl
		? {
				url: tursoDatabaseUrl,
				authToken: process.env.TURSO_AUTH_TOKEN
			}
		: {
				url: process.env.DB_FILE_NAME ?? 'data/boundary.sqlite'
			}
});
