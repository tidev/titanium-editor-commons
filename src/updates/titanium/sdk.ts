import * as semver from 'semver';
import { UpdateInfo } from '..';
import * as cli from './cli';
import { ProductNames } from '../product-names';
import { CustomError, exec, InstallError } from '../../util';
import { ExecaReturnValue } from 'execa';

interface SDKInfo {
	name: string;
	version: string;
}

interface SDKListInfo {
	name: string;
	manifest: {
		name: string;
		version: string;
	}
}

interface SDKList {
	activeSDK: string;
	defaultInstallLocation: string;
	installLocations: string[];
	installed: Record<string, string>;
	releases: Record<string, SDKListInfo>;
	sdks: Record<string, SDKListInfo>
}

export async function checkInstalledVersion (validateSelected = false): Promise<SDKInfo|undefined> {
	let latestSDK: SDKInfo|undefined;

	let stdout;
	try {
		const result = await runTiCommand([ 'sdk', 'list', '--output', 'json' ]);
		stdout = result.stdout;
	} catch (error) {
		if (error instanceof InstallError) {
			throw error;
		}
	}

	if (!stdout) {
		return;
	}

	const { activeSDK, sdks: installedSdks } = JSON.parse(stdout) as SDKList;
	// We only care about the active SDK check if there actually is an activeSDK in the output
	let activeSDKMissing = activeSDK !== undefined;
	for (const { manifest, name } of Object.values(installedSdks)) {
		if (name === activeSDK) {
			activeSDKMissing = false;
		}

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

	if (validateSelected && activeSDKMissing) {
		const options = [
			{
				title: `Install ${activeSDK}`,
				run() {
					return installUpdate(activeSDK);
				}
			}
		];

		if (latestSDK) {
			options.push({
				title: `Select SDK ${latestSDK.name}`,
				async run() {
					await runTiCommand([ 'sdk', 'select', (latestSDK as SDKInfo).name ]);
				}
			});
		}

		throw new CustomError(`Selected SDK ${activeSDK} is not installed`, 'ESELECTEDSDKNOTINSTALLED', options);
	}
	return latestSDK;
}

export async function checkLatestVersion (): Promise<SDKInfo> {
	const { stdout } = await runTiCommand([ 'sdk', 'list', '--releases', '--output', 'json' ]);
	const releases = Object.keys(JSON.parse(stdout).releases).map(name => name.replace('.GA', ''));
	const latest = releases.sort(semver.rcompare)[0];

	return {
		name: `${latest}.GA`,
		version: latest
	};
}

export async function installUpdate (version: string): Promise<void> {
	try {
		await runTiCommand([ 'sdk', 'install', version, '--default' ]);
	} catch (error) {
		if (error instanceof InstallError) {
			throw error;
		}

		throw new InstallError('Failed to install SDK');
	}
}

export function getReleaseNotes (version: string): string {
	// https://titaniumsdk.com/guide/Titanium_SDK/Titanium_SDK_Release_Notes/Titanium_SDK_Release_Notes_10.x/Titanium_SDK_10.0.0.GA_Release_Note.html
	const versionData = semver.parse(semver.coerce(version));
	if (!versionData) {
		throw new Error(`Failed to parse major version from ${version}`);
	}
	return `https://titaniumsdk.com/guide/Titanium_SDK/Titanium_SDK_Release_Notes/Titanium_SDK_Release_Notes_${versionData.major}.x/Titanium_SDK_${version}_Release_Note.html`;
}

export async function checkForUpdate (): Promise<UpdateInfo> {
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

/**
 * Runs the Titanium CLI, first attempting to use the Ti CLI directly and falling back to via Appc
 * CLI if not found
 *
 * @param {string[]} args - The arguments to be ran
 */
async function runTiCommand (args: string[]): Promise<ExecaReturnValue> {
	try {
		if (await cli.checkInstalledVersion()) {
			return exec('ti', args, { shell: true });
		}
	} catch (error) {
		// ignore
	}

	throw new Error('Failed to run');
}
