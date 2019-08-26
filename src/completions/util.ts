import * as fs from 'fs-extra';
import * as path from 'path';

import * as core from '../updates/appc/core';

import os from 'os';

export class CustomError extends Error {

	public code: string;
	constructor (message: string, code: string) {
		super(message);
		this.code = code;
	}
}

export async function getAlloyVersion () {
	const appcPath = path.join(os.homedir(), '.appcelerator', 'install');
	const appcVersion = await core.checkInstalledVersion();
	if (!appcVersion) {
		throw Error('Unable to find installed CLI version.');
	}
	const alloyPath = path.join(appcPath, appcVersion, 'package', 'node_modules', 'alloy');
	const { version: alloyVersion } = await fs.readJSON(path.join(alloyPath, 'package.json'));
	return alloyVersion;
}

export function getSDKCompletionsFileName (sdkVersion: string, completionsVersion: number) {
	return path.join(os.homedir(), '.titanium', 'completions', 'titanium', sdkVersion, `completions-v${completionsVersion}.json`);
}

export function getAlloyCompletionsFileName (alloyVersion: string, completionsVersion: number) {
	return path.join(os.homedir(), '.titanium', 'completions', 'alloy', alloyVersion, `completions-v${completionsVersion}.json`);
}
