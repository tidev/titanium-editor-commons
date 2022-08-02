import * as fs from 'fs-extra';
import * as path from 'path';

import { exec } from '../util';

import os from 'os';

export function getSDKCompletionsFileName (sdkVersion: string, completionsVersion: number): string {
	return path.join(os.homedir(), '.titanium', 'completions', 'titanium', sdkVersion, `completions-v${completionsVersion}.json`);
}

export function getAlloyCompletionsFileName (alloyVersion: string, completionsVersion: number): string {
	return path.join(os.homedir(), '.titanium', 'completions', 'alloy', alloyVersion, `completions-v${completionsVersion}.json`);
}

/**
 * Finds Alloy and returns the active path and version. First looking for the Appc CLI bundled
 * version, falling back to the globally installed npm version.
 *
 * @returns {Promise<{ path: string, version: string }>}
 */
export async function findAlloy (): Promise<{ alloyPath: string, alloyVersion: string }> {
	let alloyPath;
	const npmDir = await getNpmRoot();
	const npmAlloyPath = path.join(npmDir, 'alloy');
	if (await fs.pathExists(npmAlloyPath)) {
		alloyPath = npmAlloyPath;
	}

	if (!alloyPath) {
		throw new Error('Unable to find Alloy');
	}

	const { version: alloyVersion } = await fs.readJSON(path.join(alloyPath, 'package.json'));
	return { alloyPath, alloyVersion };
}

let npmRoot: string;
async function getNpmRoot (): Promise<string> {
	if (npmRoot) {
		return npmRoot;
	}
	try {
		const { stdout } = await exec('npm', [ 'root', '-g' ], { shell: true });
		return npmRoot = stdout.trim();
	} catch (error) {
		throw new Error('Unable to find npm root');
	}
}
