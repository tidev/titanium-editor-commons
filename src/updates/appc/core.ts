
import { run } from 'appcd-subprocess';
import * as fs from 'fs-extra';
import got from 'got';
import * as os from 'os';
import * as path from 'path';
import * as semver from 'semver';
import { UpdateInfo } from '..';
import { InstallError } from '../util';

const filePath = path.join(os.homedir(), '.appcelerator', 'install', '.version');

const PRODUCT_NAME = 'Appcelerator CLI';
const RELEASE_NOTES = 'https://docs.appcelerator.com/platform/latest/?print=/guide/Appcelerator_CLI_Release_Notes';

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
		productName: PRODUCT_NAME,
		releaseNotes: RELEASE_NOTES,
		priority: 10,
		hasUpdate: false
	};

	if (!currentVersion || semver.gt(latestVersion, currentVersion)) {
		updateInfo.hasUpdate = true;
	}
	return updateInfo;
}
export async function checkInstalledVersion () {
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
	const { code, stdout, stderr } = await run('appc', [ 'use', version ], { shell: true });
	if (code) {
		throw new InstallError('Failed to install package', {
			code,
			stderr,
			stdout
		});
	}
}
