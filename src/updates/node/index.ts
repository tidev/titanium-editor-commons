import { exec } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as semver from 'semver';
import got from 'got';

function getVersion(): string | undefined {
	let version = '';
	try {
		exec('node --version', function (err, stdout) {
			if (err) {
				throw err;
			}
			version = stdout;
		});
	} catch (e) {
		return;
	}

	return version;
}

export function checkInstalledVersion(): string | undefined {
	const version = getVersion();

	if (version && !semver.satisfies(version, '>=10.13')) {
		throw new Error('Titanium requires node 10.13 or greater.');
	}

	return version;
}

export async function checkLatestVersion(sdkPath?: string): Promise<string | undefined> {

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

	const LatestVersion: string | null = semver.maxSatisfying(versions, supportedVersions);
	const currentVersion = getVersion();

	if (currentVersion && LatestVersion && semver.lt(currentVersion, LatestVersion)) {

		return `https://nodejs.org/dist/v${semver.clean(LatestVersion)}/`;

	}

	return;

}

export function installUpdate(version: string): string {
	if (!semver.satisfies(version, '>=10.13')) {
		throw new Error('Titanium requires node 10.13 or greater.');
	}

	return `https://nodejs.org/dist/v${semver.clean(version)}/`;

}

export function getReleaseNotes(version: string): string {

	return `https://nodejs.org/en/blog/release/v${semver.clean(version)}/`;

}
