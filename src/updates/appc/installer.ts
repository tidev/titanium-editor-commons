import execa from 'execa';
import * as semver from 'semver';
import { UpdateInfo } from '..';
import { ProductNames } from '../product-names';
import * as util from '../util';
import { exec } from '../../util';

export async function checkInstalledVersion (): Promise<string|undefined> {
	// First try running appc cli to get the version
	try {
		const { stdout } = await exec('appc', [ '--version', '--output', 'json' ], { shell: true });
		const { NPM } = JSON.parse(stdout);
		return NPM;
	} catch (error) {
		// squelch
	}

	return util.checkInstalledNpmPackageVersion('appcelerator');
}

export async function checkLatestVersion (): Promise<string> {
	return util.checkLatestNpmPackageVersion('appcelerator');
}

export async function installUpdate (version: string): Promise<execa.ExecaReturnValue> {
	return util.installNpmPackage('appcelerator', version);
}

export function getReleaseNotes (): string {
	// There are no public release notes for appc-install, so just point to the latest CLI release notes
	return 'https://titaniumsdk.com/guide/Appcelerator_CLI/Appcelerator_CLI_Release_Notes/';
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
		productName: ProductNames.AppcInstaller,
		releaseNotes: getReleaseNotes(),
		priority: 10,
		hasUpdate: false
	};

	if (!currentVersion || semver.gt(latestVersion, currentVersion)) {
		updateInfo.hasUpdate = true;
	}
	return updateInfo;
}
