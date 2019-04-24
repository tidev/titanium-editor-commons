import globalNpmPath from 'global-modules';
import * as path from 'path';

export class InstallError extends Error {
	public code: string;
	public exitCode: number;
	public stderr: string;
	public stdout: string;

	constructor (
		message: string,
		{ code, stderr, stdout}: { code: number, stderr: string, stdout: string }
	) {
		super(message);

		this.code = 'EINSTALLFAILED';
		this.exitCode = code;
		this.stderr = stderr;
		this.stdout = stdout;
	}
}

export function getNpmPackagePath (packageName: string) {
	return path.join(globalNpmPath, packageName, 'package.json');
}
