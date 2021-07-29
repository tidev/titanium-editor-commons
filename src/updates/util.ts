import execa from 'execa';
import got from 'got';
import { exec } from '../util';

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
		metadata: InstallErrorMetadata,
		code = 'EINSTALLFAILED'
	) {
		super(message);

		this.code = code;
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
		// We have to force NODE_ENV to undefined as atom has it always set to production which breaks npm ls
		const { stdout } = await exec('npm', [ 'ls', `${name}`, '--json', '--depth', '0', '--global' ], { shell: true, env: { ...process.env, NODE_ENV: undefined }  });
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
	const { body } = await got<{ version: string }>(`https://registry.npmjs.org/${name}/latest`, {
		responseType: 'json'
	});
	return body.version;
}

/**
 * Install a package from npm
 *
 * @param {String} name The package to install
 * @param {String} version The version to install
 */
export async function installNpmPackage(name: string, version: string): Promise<execa.ExecaReturnValue> {
	try {
		return await exec('npm', [ 'install', '-g', `${name}@${version}`, '--json' ], { shell: true });
	} catch (error) {
		try {
			const jsonResponse = JSON.parse(error.metadata.stdout);
			error.metadata.errorCode = jsonResponse.error && jsonResponse.error.code;
		} catch (_error) {
			// squash
		}

		throw error;
	}
}
