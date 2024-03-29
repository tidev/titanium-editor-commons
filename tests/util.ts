import * as sinon from 'sinon';
import execa from 'execa';

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
			.withArgs(`npm install -g ${packageName}@${version} --json`, sinon.match.any)
			.rejects({ stdout: '{ "error": { "code": "EACCES" } }' } as execa.ExecaReturnValue);
	} else {
		stub
			.withArgs(`npm install -g ${packageName}@${version} --json`, sinon.match.any)
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
 *
 * @param {sinon.SinonStub} stub - The sinon stub instance
 */

export function mockSdkListReleases(stub: sinon.SinonStub): void {
	stub
		.withArgs('ti', [ 'sdk', 'list', '--releases', '--output', 'json' ], sinon.match.any)
		.resolves({ stdout: `{
			"releases": {
				"8.0.0.GA": "https://github.com/appcelerator/titanium_mobile/releases/download/8_0_0_GA/mobilesdk-8.0.0.GA-osx.zip"
			}
		}` });
}

/**
 * Mocks the ti sdk list output to return the requested SDK alongside an older GA SDK
 * (7.0.2.GA) and a non GA SDK (8.1.0.v20190416065710)
 *
 * @param {sinon.SinonStub} stub - The sinon stub instance
 * @param {String} version - The version to insert, if the value is undefined then an empty array will be returned
 * @param {String} activeSDK - The version to set as the active/selected SDK
 */
export function mockSdkList (stub: sinon.SinonStub, version?: string, activeSDK?: string): void {
	if (version && !activeSDK) {
		activeSDK = version;
	}

	const output = {
		activeSDK: activeSDK ? `${activeSDK}.GA` : undefined,
		sdks: {}
	};

	if (version) {
		output.sdks = {
			'7.0.2.GA': {
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
				path: '/Users/tester/Library/Application Support/Titanium/mobilesdk/osx/7.0.2.GA'
			},
			'8.1.0.v20190416065710': {
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
				path: '/Users/tester/Library/Application Support/Titanium/mobilesdk/osx/8.1.0.v20190416065710'
			},
			[`${version}.GA`]: {
				name: `${version}.GA`,
				manifest: {
					name: `${version}.v20181115134726`,
					version: `${version}`,
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
				path: `/Users/tester/Library/Application Support/Titanium/mobilesdk/osx/${version}.GA`
			}
		};
	}

	mockNpmCli(stub, 'titanium', '5.3.0');
	stub
		.withArgs('ti', [ 'sdk', 'list', '--output', 'json' ], sinon.match.any)
		.resolves({ stdout: JSON.stringify(output) });
}

/**
 * Mocks the ti sdk install command
 *
 *
 * @param {sinon.SinonStub} stub - Sinon stub insance
 * @param {string} version - Version to be installed
 */
export function mockSdkInstall (stub: sinon.SinonStub, version: string): void {
	mockNpmCli(stub, 'titanium', '5.3.0');
	stub
		.withArgs('ti', [ 'sdk', 'install', version, '--default' ], sinon.match.any)
		.resolves({ stdout: '{}' });
}

/**
 * Mocks the process.platform property
 *
 * @export
 * @param {string} platform - The platform to return
 * @returns {Function} - Function to call to restore original the process.platform value
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
