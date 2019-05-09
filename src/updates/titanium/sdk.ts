import * as semver from 'semver';
import { sdk } from 'titaniumlib';
import { UpdateInfo } from '..';
import { ProductNames } from '../product-names';
import * as util from '../util';

export async function checkForUpdate () {
	const [ currentVersion, latestVersion ] = await Promise.all([
		checkInstalledVersion(),
		checkLatestVersion()
	]);

	const updateInfo: UpdateInfo = {
		currentVersion: currentVersion ? currentVersion.name : '',
		latestVersion: latestVersion.name,
		action: installUpdate,
		productName: ProductNames.TitaniumSDK,
		releaseNotes: getReleaseNotes(latestVersion.name),
		priority: 100,
		hasUpdate: false
	};

	if (!currentVersion || semver.gt(latestVersion.version, currentVersion.version)) {
		updateInfo.hasUpdate = true;
	}

	return updateInfo;
}
export async function checkInstalledVersion () {
	let latestSDK;
	for (const { manifest, name } of sdk.getInstalledSDKs(true)) {
		// ignore if not a GA
		if (!name.includes('.GA')) {
			continue;
		}
		if (!latestSDK || semver.gt(manifest.version, latestSDK.version)) {
			latestSDK = {
				name,
				version: manifest.version
			};
		}
	}
	return latestSDK;
}

export async function checkLatestVersion () {
	const { latest } = await sdk.getReleases();

	return {
		name: latest.name,
		version: latest.version
	};
}

export async function installUpdate (version: string) {
	try {
		await sdk.install({
			uri: version
		});
	} catch (error) {
		throw new util.InstallError('Failed to install package', error);
	}

}

export function getReleaseNotes(version: string) {
	return `https://docs.appcelerator.com/platform/latest/#!/guide/Titanium_SDK_${version}_Release_Note`;
}
