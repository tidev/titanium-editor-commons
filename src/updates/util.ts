import execa from 'execa';
import { exec } from '../util';
import * as libnpm from 'libnpm';

interface InstallErrorMetadata {
	code?: number;
	errorCode?: string;
	exitCode?: number;
	stderr: string;
	stdout: string;
	command?: string;
}

export class InstallError extends Error {
	public code: string;
	public metadata: InstallErrorMetadata;

	constructor (
		message: string,
		metadata: InstallErrorMetadata
	) {
		super(message);

		this.code = 'EINSTALLFAILED';
		this.metadata = metadata || {};
	}
}

/**
 * Check the version of a package that is installed globally via npm
 *
 * @param {String} name The package to check for
 */
export async function checkInstalledNpmPackageVersion (name: string): Promise<string|undefined> {
	try {
		const { stdout } = await exec('npm', [ 'ls', `${name}`, '--json', '--depth', '0', '--global' ], { shell: true });
		const { dependencies } = JSON.parse(stdout);
		return dependencies[name]?.version;
	} catch (error) {
		// squelch
	}
}

/**
 * Check the latest version of a package on the npm registry
 *
 * @param {String} name The package to look up
 */
export async function checkLatestNpmPackageVersion(name: string): Promise<string> {
	const { version } = await libnpm.manifest(`${name}@latest`);
	return version;
}

/**
 * Install a package from npm
 *
 * @param {String} name The package to install
 * @param {String} version The version to install
 */
export async function installNpmPackage(name: string, version: string): Promise<execa.ExecaReturnValue> {
	try {
		return exec('npm', [ 'install', '-g', `${name}@${version}`, '--json' ], { shell: true });
	} catch (error) {
		try {
			const jsonResponse = JSON.parse(error.stdout);
			error.errorCode = jsonResponse.error && jsonResponse.error.code;
		} catch (_error) {
			// squash
		}

		throw error;
	}
}
