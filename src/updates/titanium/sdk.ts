import * as semver from 'semver';
import { UpdateInfo } from '..';
import * as cli from './cli';
import { ProductNames } from '../product-names';
import { exec, InstallError } from '../../util';
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

export async function checkInstalledVersion (): Promise<SDKInfo|undefined> {
	let latestSDK;

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

	const installedSdks: Record<string, SDKListInfo> = JSON.parse(stdout).sdks;

	for (const { manifest, name } of Object.values(installedSdks)) {
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
		// ignore and continue on to appc
	}

	await checkLoggedIn();

	try {
		return exec('appc', [ 'ti', ...args ], { shell: true });
	} catch (error) {
		// ignore and throw
	}

	throw new Error('Failed to run');
}

async function checkLoggedIn (): Promise<void> {
	const { stdout } = await exec('appc', [ 'whoami', '-o', 'json' ], { shell: true });
	const whoami = JSON.parse(stdout);
	if (!whoami.username) {
		throw new InstallError('Failed to run appc cli as you are not logged in.', {
			stderr: '',
			stdout: ''
		}, 'ENOTLOGGEDIN');
	}
}
