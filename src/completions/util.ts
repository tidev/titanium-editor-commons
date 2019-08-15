import * as fs from 'fs-extra';
import * as path from 'path';

import { checkInstalledVersion } from '../updates/appc/core';

import { homedir } from 'os';

export class CustomError extends Error {

	public code: string;
	constructor (message: string, code: string) {
		super(message);
		this.code = code;
	}
}

export async function getAlloyVersion () {
	const appcPath = path.join(homedir(), '.appcelerator', 'install');
	const appcVersion = await checkInstalledVersion();
	if (!appcVersion) {
		throw Error('Unable to find installed CLI version.');
	}
	const alloyPath = path.join(appcPath, appcVersion, 'package', 'node_modules', 'alloy');
	const { version: alloyVersion } = await fs.readJSON(path.join(alloyPath, 'package.json'));
	return alloyVersion;
}

export function getSDKCompletionsFileName (sdkVersion: string, completionsVersion: number) {
	return path.join(homedir(), '.titanium', 'completions', 'titanium', sdkVersion, `completions${completionsVersion}.json`);
}

export function getAlloyCompletionsFileName (alloyVersion: string, completionsVersion: number) {
	return path.join(homedir(), '.titanium', 'completions', 'alloy', alloyVersion, `completions${completionsVersion}.json`);
}
