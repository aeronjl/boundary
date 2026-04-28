import { cpSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const functionsRoot = '.vercel/output/functions';
const wsSource = 'node_modules/ws';

if (!existsSync(functionsRoot) || !existsSync(wsSource)) {
	process.exit(0);
}

const functionDirs: string[] = [];

function collectFunctionDirs(directory: string) {
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const path = join(directory, entry.name);

		if (!entry.isDirectory()) continue;

		if (entry.name.endsWith('.func')) {
			functionDirs.push(path);
			continue;
		}

		collectFunctionDirs(path);
	}
}

collectFunctionDirs(functionsRoot);

let copied = 0;
for (const functionDir of functionDirs) {
	const nodeModules = join(functionDir, 'node_modules');
	if (!existsSync(nodeModules)) continue;

	cpSync(wsSource, join(nodeModules, 'ws'), { recursive: true, force: true });
	copied += 1;
}

if (copied > 0) {
	console.log(`Included ws in ${copied} Vercel function bundle(s).`);
}
