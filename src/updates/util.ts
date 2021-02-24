import { run } from 'appcd-subprocess';
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
		const { stdout } = await run('npm', [ 'ls', `${name}`, '--json', '--depth', '0', '--global' ], { shell: true });
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
export async function installNpmPackage(name: string, version: string): Promise<void> {
	const { code, stdout, stderr } = await run('npm', [ 'install', '-g', `${name}@${version}`, '--json' ], { shell: true, ignoreExitCode: true });
	if (code) {
		const metadata = {
			errorCode: '',
			exitCode: code,
			stderr,
			stdout,
			command: `npm install -g ${name}@${version}`
		};
		try {
			const jsonResponse = JSON.parse(stdout);
			metadata.errorCode = jsonResponse.error && jsonResponse.error.code;
		} catch (error) {
			// squash
		}
		throw new InstallError('Failed to install package', metadata);
	}
}
