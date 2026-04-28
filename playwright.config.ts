import type { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
	webServer: {
		command:
			'bun run db:setup && bun run build && bun run preview -- --host 127.0.0.1 --port 4174 --strictPort',
		port: 4174,
		timeout: 120000,
		env: {
			...process.env,
			ADMIN_TOKEN: 'test-admin-token'
		}
	},
	testDir: 'tests',
	testMatch: /(.+\.)?(test|spec)\.[jt]s/
};

export default config;
