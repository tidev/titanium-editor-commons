import * as semver from 'semver';
import { sdk } from 'titaniumlib';
import { UpdateInfo } from '..';

const PRODUCT_NAME = 'Titanium SDK';
const RELEASE_NOTES = 'https://docs.appcelerator.com/platform/latest/?print=/guide/Titanium_SDK_Release_Notes';

export async function checkForUpdate () {
	const [ currentVersion, latestVersion ] = await Promise.all([
		checkInstalledVersion(),
		checkLatestVersion()
	]);

	const updateInfo: UpdateInfo = {
		currentVersion: currentVersion ? currentVersion.name : '',
		latestVersion: latestVersion.name,
		action: installUpdate,
		productName: PRODUCT_NAME,
		releaseNotes: RELEASE_NOTES,
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
	await sdk.install({
		uri: version
	});
	// TODO: Write out to ~/.titanium/config.json sdk.selected to update the selected SDK
}
