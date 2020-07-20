declare module 'appcd-subprocess' {
	import { SpawnOptions } from 'child_process';

	interface RunResponse {
		code: number;
		stdout: string;
		stderr: string;
	}
	interface RunOptions extends SpawnOptions {
		ignoreExitCode?: boolean;
	}
	function run (cmd: string, args: string[], opts: RunOptions): RunResponse;
}

// export const bat: string;

// export const cmd: string;

// export const exe: string;

// export function spawn(params: any): any;

// export function which(executables: any, opts: any): any;
