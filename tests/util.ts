import * as titaniumlib from 'titaniumlib';
import * as path from 'path';
import * as os from 'os';
import mockFS from 'mock-fs';
import sinon from 'sinon';
import execa from 'execa';

/**
 * Mocks the main appc cli executable and outputs the specified core and installer versions
 *
 * @param {sinon.SinonStub} stub - A stub created by stubbing the spawn method on child_process
 * @param {string} coreVersion - Value of the core version to output
 * @param {string} installerVersion - Value of the installer version to output
 * @param {boolean} mockVersionFile - Whether to mock the appc cli version file
 */
export function mockAppcCli (stub: sinon.SinonStub, coreVersion?: string, installerVersion?: string, mockVersionFile = false): void {
	if (coreVersion && installerVersion) {
		stub
			.withArgs('appc', sinon.match.any, sinon.match.any)
			.resolves({ stdout: `{"NPM":"${installerVersion}","CLI":"${coreVersion}"}` } as execa.ExecaReturnValue);

		if (mockVersionFile) {
			const installPath = path.join(os.homedir(), '.appcelerator', 'install');
			mockFS({
				[installPath]: {
					'.version': coreVersion,
					[coreVersion]: {
						package: {
							'package.json': `{ "version": "${coreVersion}" }`
						}
					}
				},
			});
		}
		return;
	} else {
		stub
			.withArgs('appc', sinon.match.any, sinon.match.any)
			.rejects({ stderr: '/bin/sh: appc: command not found\n' });

		mockNpmCli(stub, 'appcelerator', installerVersion);

		if (coreVersion) {
			const installPath = path.join(os.homedir(), '.appcelerator', 'install');
			mockFS({
				[installPath]: {
					'.version': coreVersion,
					[coreVersion]: {
						package: {
							'package.json': `{ "version": "${coreVersion}" }`
						}
					}
				},
			});
		} else if (mockVersionFile) {
			mockFS({});
		}
	}
}

/**
 * Mocks the npm cli to return data for the specified package
 * @param {sinon.SinonStub} stub - A stub created by stubbing the spawn method on child_process
 * @param {string} packageName - Name of the package to return
 * @param {string} version - Version of the package to return
 */
export function mockNpmCli (stub: sinon.SinonStub, packageName: string, version?: string): void {
	if (version) {
		stub
			.withArgs('npm', [ 'ls', `${packageName}`, '--json', '--depth', '0', '--global' ], sinon.match.any)
			.resolves({
				stdout: `{
					"dependencies": {
						"${packageName}": {
							"version": "${version}",
							"from": "${packageName}@${version}",
							"resolved": "https://registry.npmjs.org/${packageName}/-/${packageName}-${version}.tgz"
						}
						}
					}`
			} as execa.ExecaReturnValue);
	} else {
		stub
			.withArgs('npm', [ 'ls', `${packageName}`, '--json', '--depth', '0', '--global' ], sinon.match.any)
			.resolves({ stdout: '{}' });
	}
}

/**
 * Mocks the npm install command for a package
 *
 * @param {sinon.SinonStub} stub - A stub created by stubbing the spawn method on child_process
 * @param {string} packageName - Name of the package to return
 * @param {string} version - Version of the package to return
 * @param {boolean} throws - Whether the command should throw or not
 */
export function mockNpmInstall(stub: sinon.SinonStub, packageName: string, version: string, throws = false): void {

	if (throws) {
		stub
			.withArgs(`npm install -g ${packageName}@${version} --json`, global.sandbox.match.any)
			.rejects({ stdout: '{ "error": { "code": "EACCES" } }' } as execa.ExecaReturnValue);
	} else {
		stub
			.withArgs(`npm install -g ${packageName}@${version} --json`, global.sandbox.match.any)
			.resolves({	stdout: '{ "error": { "code": "EACCES" } }' } as execa.ExecaReturnValue);
	}
}

/**
 * Mocks the Node.js executable to return the specified value
 *
 * @param {sinon.SinonStub} stub - A stub created by stubbing the spawn method on child_process
 * @param {string} [version] - Version to output
 */
export function mockNode (stub: sinon.SinonStub, version?: string): void {
	if (version) {
		stub
			.withArgs('node', sinon.match.any, sinon.match.any)
			.resolves({ stdout: version } as execa.ExecaReturnValue);
	} else {
		stub
			.withArgs('node', sinon.match.any, sinon.match.any)
			.rejects({ stderr: '/bin/sh: node: command not found' });
	}
}
/**
 * Mocks titaniumlibs sdk.getInstalledSDKs to return the requested SDK alongside an older GA SDK
 * (7.0.2.GA) and a non GA SDK (8.1.0.v20190416065710)
 *
 * @param {String} version - The version to insert, if the value is undefined then an empty array will be returned
 */
export function mockSdk(version?: string): void {
	if (version === undefined) {
		global.sandbox
			.stub(titaniumlib.sdk, 'getInstalledSDKs')
			.returns([]);
	} else {
		global.sandbox
			.stub(titaniumlib.sdk, 'getInstalledSDKs')
			.returns([
				{
					name: '7.0.2.GA',
					manifest: {
						name: '7.0.2.v20180209105903',
						version: '7.0.2',
						moduleAPIVersion: {
							iphone: '2',
							android: '4',
							windows: '4'
						},
						timestamp: '2/9/2018 19:05',
						githash: '5ef0c56',
						platforms: [
							'iphone',
							'android'
						]
					},
					path: '/Users/eharris/Library/Application Support/Titanium/mobilesdk/osx/7.0.2.GA'
				},
				{
					name: `${version}.GA`,
					manifest: {
						name: `${version}.v20181115134726`,
						version,
						moduleAPIVersion: {
							iphone: '2',
							android: '4',
							windows: '6'
						},
						timestamp: '11/15/2018 21:52',
						githash: '2e5a7423d0',
						platforms: [
							'iphone',
							'android'
						]
					},
					path: `/Users/eharris/Library/Application Support/Titanium/mobilesdk/osx/${version}.GA`
				},
				{
					name: '8.1.0.v20190416065710',
					manifest: {
						name: '8.1.0.v20190416065710',
						version: '8.1.0',
						moduleAPIVersion: {
							iphone: '2',
							android: '4',
							windows: '7'
						},
						timestamp: '4/16/2019 14:03',
						githash: '37f6d88',
						platforms: [
							'iphone',
							'android'
						]
					},
					path: '/Users/eharris/Library/Application Support/Titanium/mobilesdk/osx/8.1.0.v20190416065710'
				}
			]);
	}
}

/**
 * Mocks the process.platform property
 *
 * @export
 * @param {string} platform - The platform to return
 * @returns {() => void} - Function to call to restore original the process.platform value
 */
export function mockOS (platform: string): () => void {
	const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');

	Object.defineProperty(process, 'platform', {
		value: platform
	});

	return () => {
		Object.defineProperty(process, 'platform', originalPlatform!); // eslint-disable-line @typescript-eslint/no-non-null-assertion
	};
}
