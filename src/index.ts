import * as completion from './completions';
import * as environment from './environment';
import * as updates from './updates';
import { InstallError, CustomError } from './util';

const Errors = {
	CustomError,
	InstallError
};

export {
	Errors,
	completion,
	environment,
	updates
};
