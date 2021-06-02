import * as semver from 'semver';
import { sdk } from 'titaniumlib';
import { UpdateInfo } from '..';
import * as cli from './cli';
import { ProductNames } from '../product-names';
import { exec } from '../../util';
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

	let useAppc = false;
	try {
		// Use Titanium CLI if it is installed as it's less failure prone
		if (await cli.checkInstalledVersion()) {
			await exec('ti', [ 'sdk', 'select', version ], { shell: true });
		} else {
			useAppc = true;
			const { stdout } = await exec('appc', [ 'whoami', '-o', 'json' ], { shell: true });
			const whoami = JSON.parse(stdout);
			if (!whoami.username) {
				// Not logged in, so throw back for the caller to deal with
				throw new util.InstallError('Failed to select SDK as you are not logged in', {
					command: `appc ti sdk select ${version}`,
					stdout: '',
					stderr: '',
					errorCode: 'ESELECTERROR'
				});
			}

			await exec('appc', [ 'ti', 'sdk', 'select', version ], { shell: true });
		}
	} catch (error) {
		if (error instanceof util.InstallError) {
			// Rethrow
			throw error;
		}

		const command = useAppc ? `appc ti sdk select ${version}` : `ti sdk select ${version}`;
		throw new util.InstallError('Failed to select SDK', {
			command,
			stdout: error.stdout || '',
			stderr: error.stderr || '',
			errorCode: 'ESELECTERROR'
		});
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
