import globalNpmPath from 'global-modules';
import * as path from 'path';

export class InstallError extends Error {
	public code: string;
	public metadata: object;

	constructor (
		message: string,
		metadata: object
	) {
		super(message);

		this.code = 'EINSTALLFAILED';
		this.metadata = metadata || {};
	}
}

export function getNpmPackagePath (packageName: string) {
	return path.join(globalNpmPath, packageName, 'package.json');
}
