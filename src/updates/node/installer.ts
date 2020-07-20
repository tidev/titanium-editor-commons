import { exec } from 'child_process';
import * as semver from 'semver';

export function checkNodeInstalled(): boolean {
	try {
		exec('node -v');
	} catch (e) {
		return false;
	}
	return true;
}

export function checkNodeVersion(): string {
	let version = '';
	try {
		exec('node --version', function (err, stdout) {
			if (err) {
				throw err;
			}
			if (!semver.satisfies(stdout, '>=10.13')) {
				throw new Error('Titanium requires node 10.13 or greater.');
			}
			version = stdout;
		});
	} catch (e) {
		throw new Error('Please install node to continue.');
	}
	return version;
}

export function getNodeVersionUrl(version: string): string {
	if (!semver.satisfies(version, '>=10.13')) {
		throw new Error('Titanium requires node 10.13 or greater.');
	}

	return `https://nodejs.org/dist/v${semver.clean(version)}/`;

}
