import * as semver from 'semver';
import { sdk } from 'titaniumlib';
import { UpdateInfo } from '..';
import { CustomError } from '../../completions/util';
import { ProductNames } from '../product-names';
import * as util from '../util';

interface SDKInfo {
	name: string;
	version: string;
}

export async function checkInstalledVersion (): Promise<SDKInfo|undefined> {
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

export async function checkLatestVersion (): Promise<SDKInfo> {
	const { latest } = await sdk.getReleases();

	return {
		name: latest.name,
		version: latest.version
	};
}

export async function installUpdate (version: string): Promise<void> {
	try {
		await sdk.install({
			uri: version
		});
	} catch (error) {
		throw new util.InstallError('Failed to install package', error);
	}

}

export function getReleaseNotes (version: string): string {
	return `https://docs.appcelerator.com/platform/latest/#!/guide/Titanium_SDK_${version}_Release_Note`;
}

export async function checkForUpdate (): Promise<UpdateInfo> {
	const [ currentVersion, latestVersion ] = await Promise.all<SDKInfo|undefined, SDKInfo>([
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
