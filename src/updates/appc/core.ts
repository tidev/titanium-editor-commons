
import { run } from 'appcd-subprocess';
import * as fs from 'fs-extra';
import got from 'got';
import os from 'os';
import * as path from 'path';
import * as semver from 'semver';
import { UpdateInfo } from '..';
import { ProductNames } from '../product-names';
import { InstallError } from '../util';

const LATEST_URL = 'https://registry.platform.axway.com/api/appc/latest';

export async function checkForUpdate () {
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
		priority: 10,
		hasUpdate: false
	};

	if (!currentVersion || semver.gt(latestVersion, currentVersion)) {
		updateInfo.hasUpdate = true;
	}
	return updateInfo;
}

export async function checkInstalledVersion () {
	const filePath = path.join(os.homedir(), '.appcelerator', 'install', '.version');
	if (!await fs.pathExists(filePath)) {
		return;
	}
	const version = await fs.readFile(filePath, 'utf8');
	return version;
}

export async function checkLatestVersion () {
	const { body } = await got(LATEST_URL, {
		json: true
	});
	return body.result[0].version;
}

export async function installUpdate (version: string) {
	// todo
	const { code, stdout, stderr } = await run('appc', [ 'use', version ], { shell: true, ignoreExitCode: true });
	if (code) {
		throw new InstallError('Failed to install package', {
			code,
			stderr,
			stdout
		});
	}
}

export function getReleaseNotes (version: string) {
	return `https://docs.appcelerator.com/platform/latest/#!/guide/Appcelerator_CLI_${version}.GA_Release_Note`;
}
