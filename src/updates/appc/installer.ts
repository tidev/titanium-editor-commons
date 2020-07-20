import { run } from 'appcd-subprocess';
import * as libnpm from 'libnpm';
import * as semver from 'semver';
import { UpdateInfo } from '..';
import { ProductNames } from '../product-names';
import * as util from '../util';

export async function checkInstalledVersion (): Promise<string|undefined> {
	// First try running appc cli to get the version
	try {
		const { stdout } = await run('appc', [ '--version', '--output', 'json' ], { shell: true });
		const { NPM } = JSON.parse(stdout);
		return NPM;
	} catch (error) {
		// squelch
	}

	// If that fails because it's not installed, or we don't have a core, fallback to npm cli which is generally slower
	try {
		const { stdout } = await run('npm', [ 'ls', 'appcelerator', '--json', '--depth', '0', '--global' ], { shell: true });
		const { dependencies: { appcelerator } } = JSON.parse(stdout);
		return appcelerator.version;
	} catch (error) {
		// squelch
	}

	return;
}

export async function checkLatestVersion (): Promise<string> {
	const { version } = await libnpm.manifest('appcelerator@latest');
	return version;
}

export async function installUpdate (version: string): Promise<void> {
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

export function getReleaseNotes (): string {
	// There are no public release notes for appc-install, so just point to the latest CLI release notes
	return 'https://docs.appcelerator.com/platform/latest/#!/guide/Appcelerator_CLI_Release_Notes';
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
		priority: 1,
		hasUpdate: false
	};

	if (!currentVersion || semver.gt(latestVersion, currentVersion)) {
		updateInfo.hasUpdate = true;
	}
	return updateInfo;
}
