import * as fs from 'fs-extra';
import * as path from 'path';
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

export async function checkInstalledVersion(): Promise<string | undefined> {
	const version = await getVersion();

	if (version && !semver.satisfies(version, '>=10.13')) {
		throw new Error('Titanium requires node 10.13 or greater.');
	}

	return version;
}

export async function checkLatestVersion(sdkPath?: string): Promise<string> {

	let supportedVersions = '10.x || 12.x';

	if (sdkPath) {
		const packageJSON = path.join(sdkPath, 'package.json');
		const { vendorDependencies } = await fs.readJSON(packageJSON);
		supportedVersions = vendorDependencies.node;
	}

	const { body } = await got('https://nodejs.org/download/release/index.json', {
		json: true
	});

	const versions = body.map(((element: { version: string }) => element.version));

	const LatestVersion = semver.maxSatisfying(versions, supportedVersions) as string;

	return LatestVersion;

}

export async function installUpdate(version: string): Promise<void> {
	let url = `https://nodejs.org/dist/v${semver.clean(version)}/node-v${semver.clean(version)}`;
	let extension = '.pkg';

	if (!semver.satisfies(version, '>=10.13')) {
		throw new Error('Titanium requires node 10.13 or greater.');
	}

	if (process.platform === 'win32') {
		extension = ((process.arch === 'x64') ? '-x64.msi' : '-x86.msi');
	}

	url += extension;

	const pipeline = promisify(stream.pipeline);

	await pipeline(
		got.stream(url),
		fs.createWriteStream(`${os.tmpdir()}file${extension}`)
	);

	try {
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

	} else {

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

	}
}

export function getReleaseNotes(version: string): string {

	return `https://nodejs.org/en/blog/release/v${semver.clean(version)}/`;

}

export async function checkForUpdate(): Promise<UpdateInfo> {
	const [ currentVersion, latestVersion ] = await Promise.all<string | undefined, string>([
		checkInstalledVersion(),
		checkLatestVersion()
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

