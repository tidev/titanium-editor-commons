import execa from 'execa';

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

export async function exec(command: string, args: string[], options: execa.Options): Promise<execa.ExecaReturnValue> {
	try {
		return await execa.command(`${command} ${args.join(' ')}`, options);
	} catch (error) {
		const { code, stderr, stdout } = error;
		const metadata = {
			exitCode: code,
			stderr,
			stdout,
			command: `${command} ${args.join(' ')}`
		};
		throw new InstallError('Failed to install package', metadata);
	}
}
