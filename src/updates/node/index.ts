import * as fs from 'fs-extra';
import * as semver from 'semver';
import { UpdateInfo, ProductNames } from '..';
import { promisify } from 'util';
import stream from 'stream';
import got from 'got';
import os from 'os';
import { exec, InstallError } from '../../util';
import execa from 'execa';

async function getVersion(): Promise<string | undefined> {
	let version;
	try {
		const { stdout } = await exec('node', [ '--version' ], { shell: true });
		version = semver.clean(stdout) || undefined;

	} catch (error) {
		return;
	}

	return version;
}

export async function checkInstalledVersion(): Promise<string | undefined> {
	const version = await getVersion();

	return version;
}

export async function checkLatestVersion(supportedVersions = '18.x || 22.x'): Promise<string> {

	const { body } = await got<Array<{ version: string }>>('https://nodejs.org/download/release/index.json', {
		responseType: 'json'
	});

	const versions = body.map(((element: { version: string }) => element.version));

	let latestVersion: string|null = semver.maxSatisfying(versions, supportedVersions) as string;

	latestVersion = semver.clean(latestVersion);

	if (!latestVersion) {
		throw new Error(`No versions satisfy the supported version ${supportedVersions}`);
	}

	return latestVersion;

}

export async function installUpdate(version: string): Promise<execa.ExecaReturnValue> {
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

	let command;
	let args;

	if (process.platform === 'win32') {
		command = 'msiexec';
		args = [ '/i', `${os.tmpdir()}file${extension}` ];
	} else if (process.platform === 'darwin') {
		command = 'installer';
		args = [ '-pkg', `${os.tmpdir()}file${extension}`, '-target', '/' ];
	} else {
		throw new Error('Failed to download due to unsupported platform');
	}

	try {
		return await exec(command, args, { shell: true });
	} catch (error) {
		if (error instanceof InstallError) {
			const stdout = error?.metadata.stdout;
			if (stdout && stdout.toLowerCase().includes('installer: must be run as root to install this package')) {
				error.metadata.errorCode = 'EACCES';
			}
		}
		throw error;
	}
}

export function getReleaseNotes(version: string): string {
	return `https://nodejs.org/en/blog/release/v${semver.clean(version)}/`;
}

export async function checkForUpdate(supportedVersions?: string): Promise<UpdateInfo> {
	const [ currentVersion, latestVersion ] = await Promise.all([
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
