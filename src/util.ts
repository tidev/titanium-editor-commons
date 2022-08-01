import execa from 'execa';

interface InstallErrorMetadata {
	code?: number;
	errorCode?: string;
	exitCode?: number;
	stderr?: string;
	stdout?: string;
	command?: string;
}

export interface Action {
	title: string;
	run: () => Promise<void>;
}
export class CustomError extends Error {

	public actions: Action[]|undefined;
	public code: string;
	constructor(message: string, code: string, actions?: Action[]) {
		super(message);
		this.actions = actions;
		this.code = code;
	}
}

export class InstallError extends Error {
	public code: string;
	public metadata: InstallErrorMetadata;

	constructor (
		message: string,
		metadata: InstallErrorMetadata = {},
		code = 'EINSTALLFAILED'
	) {
		super(message);

		this.code = code;
		this.metadata = metadata;
	}
}

interface ExecaError {
	code: number;
	stderr: string;
	stdout: string;
}

function isExecaError (error: unknown): error is ExecaError {
	if ((error as ExecaError)?.stdout) {
		return true;
	}
	return false;
}

export async function exec(command: string, args: string[], options: execa.Options): Promise<execa.ExecaReturnValue> {
	try {
		return await execa.command(`${command} ${args.join(' ')}`, options);
	} catch (error) {
		if (isExecaError(error)) {
			const { code, stderr, stdout } = error;
			const metadata = {
				exitCode: code,
				stderr,
				stdout,
				command: `${command} ${args.join(' ')}`
			};
			throw new InstallError('Failed to install package', metadata);
		}
		throw error;
	}
}
