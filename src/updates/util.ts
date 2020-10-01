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
