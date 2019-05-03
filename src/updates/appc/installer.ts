
import { run } from 'appcd-subprocess';
import * as fs from 'fs-extra';
import * as libnpm from 'libnpm';
import * as semver from 'semver';
import { UpdateInfo } from '..';
import { ProductNames } from '../product-names';
import * as util from '../util';

const RELEASE_NOTES = 'https://docs.appcelerator.com/platform/latest/?print=/guide/Appcelerator_CLI_Release_Notes';

export async function checkForUpdate () {
	const [ currentVersion, latestVersion ] = await Promise.all([
		checkInstalledVersion(),
		checkLatestVersion()
	]);

	const updateInfo: UpdateInfo = {
		currentVersion,
		latestVersion,
		action: installUpdate,
		productName: ProductNames.AppcInstaller,
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
	const filePath = util.getNpmPackagePath('appcelerator');
	if (!await fs.pathExists(filePath)) {
		return;
	}
	const { version } = await fs.readJSON(filePath);
	return version;
}

export async function checkLatestVersion () {
	const { version } = await libnpm.manifest('appcelerator@latest');
	return version;
}

export async function installUpdate (version: string) {
	// todo
	const { code, stdout, stderr } = await run('npm', [ 'install', '-g', `appcelerator@${version}`, '--json' ], { shell: true, ignoreExitCode: true });
	if (code) {
		const metadata = {
			errorCode: null,
			exitCode: code,
			stderr,
			stdout,
			command: `npm install -g appcelerator@${version}`
		};
		try {
			const jsonResponse = JSON.parse(stdout);
			metadata.errorCode = jsonResponse.error && jsonResponse.error.code;
		} catch (error) {
			// squash
		}
		throw new util.InstallError('Failed to install package', metadata);
	}
}
