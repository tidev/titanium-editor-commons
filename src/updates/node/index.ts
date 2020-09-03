import * as fs from 'fs-extra';
import * as semver from 'semver';
import * as util from '../util';
import { run } from 'appcd-subprocess';
import { UpdateInfo, ProductNames } from '..';
import { promisify } from 'util';
import stream from 'stream';
import got from 'got';
import os from 'os';

async function getVersion(): Promise<string | undefined> {
	let version;
	try {
		const { stdout } = await run('node', [ '--version' ], { shell: true });
		version = semver.clean(stdout) || undefined;

	} catch (error) {
		return;
	}

	return version;
}

export async function checkInstalledVersion(semverRange = '>=10.13'): Promise<string | undefined> {
	const version = await getVersion();

	if (version && !semver.satisfies(version, semverRange)) {
		throw new Error(`Titanium requires Node.js ${semverRange}`);
	}

	return version;
}

export async function checkLatestVersion(supportedVersions = '10.x || 12.x'): Promise<string> {

	const { body } = await got('https://nodejs.org/download/release/index.json', {
		json: true
	});

	const versions = body.map(((element: { version: string }) => element.version));

	let latestVersion: string|null = semver.maxSatisfying(versions, supportedVersions) as string;

	latestVersion = semver.clean(latestVersion);

	if (!latestVersion) {
		throw new Error(`No versions satisfy the supported version ${supportedVersions}`);
	}

	return latestVersion;

}

export async function installUpdate(version: string): Promise<void> {
	let extension = '.pkg';

	if (process.platform === 'win32') {
		extension = ((process.arch === 'x64') ? '-x64.msi' : '-x86.msi');
	}

	const url = `https://nodejs.org/dist/v${semver.clean(version)}/node-v${semver.clean(version)}${extension}`;

	const pipeline = promisify(stream.pipeline);

	try {
		await pipeline(
			got.stream(url),
			fs.createWriteStream(`${os.tmpdir()}file${extension}`)
		);
		await fs.ensureFile(`${os.tmpdir()}file${extension}`);
	} catch (err) {
		throw new Error('Node.js failed to download');
	}

	if (process.platform === 'win32') {
		const { code, stdout, stderr } = await run('msiexec', [ '/i', `${os.tmpdir()}file${extension}` ], { shell: true, ignoreExitCode: true });

		if (code) {
			const metadata = {
				errorCode: '',
				exitCode: code,
				stderr,
				stdout,
				command: `msiexec /i ${os.tmpdir()}file${extension}`
			};

			throw new util.InstallError('Failed to install package', metadata);
		}

	} else if (process.platform === 'darwin') {

		const { code, stdout, stderr } = await run('installer', [ '-pkg', `${os.tmpdir()}file${extension}`, '-target', '/' ], { shell: true, ignoreExitCode: true });

		if (code) {
			const metadata = {
				errorCode: '',
				exitCode: code,
				stderr,
				stdout,
				command: `sudo installer -pkg ${os.tmpdir()}file${extension} -target /`
			};
			if (stdout === 'installer: Must be run as root to install this package.\n') {
				metadata.errorCode = 'EACCES';
			}

			throw new util.InstallError('Failed to install package', metadata);
		}

	} else {
		throw new Error('Failed to download due to unsupported platform');
	}
}

export function getReleaseNotes(version: string): string {

	return `https://nodejs.org/en/blog/release/v${semver.clean(version)}/`;

}

export async function checkForUpdate(supportedVersions?: string): Promise<UpdateInfo> {
	const [ currentVersion, latestVersion ] = await Promise.all<string | undefined, string>([
		checkInstalledVersion(),
		checkLatestVersion(supportedVersions)
	]);

	const updateInfo: UpdateInfo = {
		currentVersion,
		latestVersion,
		action: installUpdate,
		productName: ProductNames.Node,
		releaseNotes: getReleaseNotes(latestVersion),
		priority: 1,
		hasUpdate: false
	};

	if (!currentVersion || semver.gt(latestVersion, currentVersion)) {
		updateInfo.hasUpdate = true;
	}
	return updateInfo;
}

