/* eslint @typescript-eslint/no-namespace: off */
import os from 'os';
import * as sinon from 'sinon';
import * as tmp from 'tmp';

declare global {
	namespace NodeJS {
		interface Global {
			sandbox: sinon.SinonSandbox;
			TMP_DIR: tmp.DirResult;
		}
	}
}

beforeEach(() => {
	global.TMP_DIR = tmp.dirSync();
	global.sandbox = sinon.createSandbox();
	global.sandbox.stub(os, 'homedir').returns(global.TMP_DIR.name);

});

afterEach(() => {
	global.TMP_DIR.removeCallback();
	global.sandbox.restore();
});
