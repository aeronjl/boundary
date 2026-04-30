import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

const artifactDir = 'artifacts';
const databasePath = join(artifactDir, 'policy-scenario.sqlite');
const exportPath = join(artifactDir, 'policy-scenario-export.json');

const localEnv: NodeJS.ProcessEnv = {
	...process.env,
	ADMIN_TOKEN: process.env.ADMIN_TOKEN ?? 'ci-admin-token',
	DB_FILE_NAME: databasePath,
	VERCEL: ''
};

delete localEnv.TURSO_DATABASE_URL;
delete localEnv.TURSO_AUTH_TOKEN;
delete localEnv.DATABASE_URL;
delete localEnv.DATABASE_AUTH_TOKEN;

async function removeGeneratedFiles() {
	await mkdir(artifactDir, { recursive: true });
	await Promise.all([
		rm(databasePath, { force: true }),
		rm(`${databasePath}-shm`, { force: true }),
		rm(`${databasePath}-wal`, { force: true }),
		rm(exportPath, { force: true })
	]);
}

function runCommand(command: string, args: string[]): Promise<void> {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			env: localEnv,
			stdio: 'inherit'
		});

		child.on('error', reject);
		child.on('exit', (code, signal) => {
			if (code === 0) {
				resolve();
				return;
			}

			reject(
				new Error(
					signal
						? `${command} ${args.join(' ')} exited on signal ${signal}.`
						: `${command} ${args.join(' ')} exited with code ${code}.`
				)
			);
		});
	});
}

await removeGeneratedFiles();
await runCommand('bun', ['run', 'db:setup']);
await runCommand('bun', ['run', 'scenario:matrix', '--output', exportPath]);

console.log(`Policy scenario CI export is available at ${exportPath}.`);
