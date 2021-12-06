import { exec } from '../../util';
import * as fs from 'fs-extra';
import got from 'got';
import os from 'os';
import * as path from 'path';
import * as semver from 'semver';
import { UpdateInfo } from '..';
import { ProductNames } from '../product-names';
import execa from 'execa';

const LATEST_URL = 'https://registry.platform.axway.com/api/appc/latest';

export async function checkInstalledVersion (): Promise<string|undefined> {
	const versionFilePath = path.join(os.homedir(), '.appcelerator', 'install', '.version');
	if (!await fs.pathExists(versionFilePath)) {
		return;
	}
	const cliVersion = await fs.readFile(versionFilePath, 'utf8');
	const packageJson = path.join(os.homedir(), '.appcelerator', 'install', cliVersion, 'package', 'package.json');
	const { version } = await fs.readJSON(packageJson);
	return version;
}

export async function checkLatestVersion (): Promise<string> {
	const { body } = await got<{ result: Array<{ name: string, version: string }>}>(LATEST_URL, {
		responseType: 'json'
	});
	return body.result[0].version;
}

export async function installUpdate (version: string): Promise<execa.ExecaReturnValue> {
	return exec('appc', [ 'use', version ], { shell: true });
}

export function getReleaseNotes (version: string): string {
	// https://titaniumsdk.com/guide/Appcelerator_CLI/Appcelerator_CLI_Release_Notes/Appcelerator_CLI_Release_Notes_9.x/Appcelerator_CLI_9.0.1_GA_Release_Note.html
	const versionData = semver.parse(version);
	if (!versionData) {
		throw new Error(`Failed to parse major version from ${version}`);
	}
	return `https://titaniumsdk.com/guide/Appcelerator_CLI/Appcelerator_CLI_Release_Notes/Appcelerator_CLI_Release_Notes_${versionData.major}.x/Appcelerator_CLI_${version}_GA_Release_Note.html`;
}

export async function checkForUpdate (): Promise<UpdateInfo> {
	const [ currentVersion, latestVersion ] = await Promise.all([
		checkInstalledVersion(),
		checkLatestVersion()
	]);

	const updateInfo: UpdateInfo = {
		currentVersion,
		latestVersion,
		action: installUpdate,
		productName: ProductNames.AppcCore,
		releaseNotes: getReleaseNotes(latestVersion),
		priority: 20,
		hasUpdate: false
	};

	if (!currentVersion || semver.gt(latestVersion, currentVersion)) {
		updateInfo.hasUpdate = true;
	}
	return updateInfo;
}
