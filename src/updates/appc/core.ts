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
	const { body } = await got(LATEST_URL, {
		json: true
	});
	return body.result[0].version;
}

export async function installUpdate (version: string): Promise<execa.ExecaReturnValue> {
	return exec('appc', [ 'use', version ], { shell: true });
}

export function getReleaseNotes (version: string): string {
	return `https://docs.appcelerator.com/platform/latest/#!/guide/Appcelerator_CLI_${version}.GA_Release_Note`;
}

export async function checkForUpdate (): Promise<UpdateInfo> {
	const [ currentVersion, latestVersion ] = await Promise.all<string|undefined, string>([
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
