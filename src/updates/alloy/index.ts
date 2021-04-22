import { ExecaReturnValue } from 'execa';
import * as semver from 'semver';
import { ProductNames, UpdateInfo } from '..';
import { checkInstalledNpmPackageVersion, checkLatestNpmPackageVersion, installNpmPackage } from '../util';

export async function checkInstalledVersion(): Promise<string|undefined> {
	return  checkInstalledNpmPackageVersion('alloy');
}

export async function checkLatestVersion(): Promise<string> {
	return checkLatestNpmPackageVersion('alloy');
}

export async function installUpdate(version: string): Promise<ExecaReturnValue> {
	return installNpmPackage('alloy', version);
}

export function getReleaseNotes(version: string): string {
	return `https://github.com/appcelerator/alloy/releases/tag/${version}`;
}

export async function checkForUpdate(): Promise<UpdateInfo> {
	const [ currentVersion, latestVersion ] = await Promise.all<string|undefined, string>([
		checkInstalledVersion(),
		checkLatestVersion()
	]);

	const updateInfo: UpdateInfo = {
		currentVersion,
		latestVersion,
		action: installUpdate,
		productName: ProductNames.Alloy,
		releaseNotes: getReleaseNotes(latestVersion),
		priority: 10,
		hasUpdate: false
	};

	if (!currentVersion || semver.gt(latestVersion, currentVersion)) {
		updateInfo.hasUpdate = true;
	}
	return updateInfo;
}
