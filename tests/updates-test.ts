import execa from 'execa';
import { appc, titanium, node, alloy, checkAllUpdates } from '../src/updates/';
import * as util from '../src/util';

import { expect } from 'chai';
import mockFS from 'mock-fs';
import nock from 'nock';
import os from 'os';
import * as path from 'path';
import { mockAppcCoreRequest, mockNpmRequest, mockSDKRequest, mockNodeRequest } from './fixtures/network/network-mocks';
import { mockAppcCli, mockNode, mockNpmCli, mockNpmInstall, mockOS, mockSdk } from './util';

let fixProcessPlatform: () => void|undefined;
describe('updates', () => {

	beforeEach(() => {
		mockFS.restore();
	});

	afterEach(() => {
		nock.cleanAll();
		mockFS.restore();
		fixProcessPlatform?.();
	});

	describe('titanium.sdk', () => {
		it('checkForUpdate with installed SDKS', async () => {
			mockSdk('7.5.0');
			mockSDKRequest();

			const update = await titanium.sdk.checkForUpdate();
			expect(update.currentVersion).to.equal('7.5.0.GA');
			expect(update.latestVersion).to.equal('8.0.0.GA');
			expect(update.productName).to.equal('Titanium SDK');
			expect(update.hasUpdate).to.equal(true);
		});

		it('checkForUpdate with no installed SDKS', async () => {
			mockSdk(undefined);
			mockSDKRequest();

			const update = await titanium.sdk.checkForUpdate();
			expect(update.currentVersion).to.equal('');
			expect(update.latestVersion).to.equal('8.0.0.GA');
			expect(update.productName).to.equal('Titanium SDK');
			expect(update.hasUpdate).to.equal(true);
		});

		it('checkForUpdate with latest installed', async () => {
			mockSdk('8.0.0');
			mockSDKRequest();

			const update = await titanium.sdk.checkForUpdate();
			expect(update.currentVersion).to.equal('8.0.0.GA');
			expect(update.latestVersion).to.equal('8.0.0.GA');
			expect(update.productName).to.equal('Titanium SDK');
			expect(update.hasUpdate).to.equal(false);
		});
	});

	describe('appc.installer', () => {

		it('checkForUpdates with install', async () => {
			const stub = global.sandbox.stub(util, 'exec');

			mockNpmRequest();
			mockAppcCli(stub, '7.1.0-master.13', '4.2.12');

			const update = await appc.install.checkForUpdate();

			expect(update.currentVersion).to.equal('4.2.12');
			expect(update.latestVersion).to.equal('4.2.13');
			expect(update.productName).to.equal('Appcelerator CLI (npm)');
			expect(update.hasUpdate).to.equal(true);
		});

		it('checkForUpdates with no core', async () => {
			const stub = global.sandbox.stub(util, 'exec');
			mockNpmRequest();
			mockAppcCli(stub, undefined, '4.2.12');

			const update = await appc.install.checkForUpdate();

			expect(update.currentVersion).to.equal('4.2.12');
			expect(update.latestVersion).to.equal('4.2.13');
			expect(update.productName).to.equal('Appcelerator CLI (npm)');
			expect(update.hasUpdate).to.equal(true);
		});

		it('checkForUpdates with no install', async () => {
			mockNpmRequest();
			const stub = global.sandbox.stub(util, 'exec');
			mockAppcCli(stub, undefined, undefined);

			const update = await appc.install.checkForUpdate();

			expect(update.currentVersion).to.equal(undefined);
			expect(update.latestVersion).to.equal('4.2.13');
			expect(update.productName).to.equal('Appcelerator CLI (npm)');
			expect(update.hasUpdate).to.equal(true);
		});

		it('checkForUpdates with latest already', async () => {
			const stub = global.sandbox.stub(util, 'exec');
			mockNpmRequest();
			mockAppcCli(stub, '7.1.0-master.13', '4.2.13');

			const update = await appc.install.checkForUpdate();

			expect(update.currentVersion).to.equal('4.2.13');
			expect(update.latestVersion).to.equal('4.2.13');
			expect(update.productName).to.equal('Appcelerator CLI (npm)');
			expect(update.hasUpdate).to.equal(false);
		});
	});

	describe('appc.core', () => {
		it('checkForUpdate with install', async () => {
			const stub = global.sandbox.stub(util, 'exec');
			mockAppcCli(stub, '4.2.0', '4.2.12', true);
			mockAppcCoreRequest('6.6.6');

			const update = await appc.core.checkForUpdate();
			expect(update.currentVersion).to.equal('4.2.0');
			expect(update.latestVersion).to.equal('6.6.6');
			expect(update.productName).to.equal('Appcelerator CLI');
			expect(update.hasUpdate).to.equal(true);
		});

		it('checkForUpdate with no install', async () => {
			const stub = global.sandbox.stub(util, 'exec');
			mockAppcCli(stub, undefined, undefined);
			mockAppcCoreRequest('6.6.6');

			const update = await appc.core.checkForUpdate();
			expect(update.currentVersion).to.equal(undefined);
			expect(update.latestVersion).to.equal('6.6.6');
			expect(update.productName).to.equal('Appcelerator CLI');
			expect(update.hasUpdate).to.equal(true);
		});

		it('checkForUpdate with latest installed', async () => {
			const stub = global.sandbox.stub(util, 'exec');
			mockAppcCli(stub, '6.6.6', '4.2.12', true);
			mockAppcCoreRequest('6.6.6');

			const update = await appc.core.checkForUpdate();
			expect(update.currentVersion).to.equal('6.6.6');
			expect(update.latestVersion).to.equal('6.6.6');
			expect(update.productName).to.equal('Appcelerator CLI');
			expect(update.hasUpdate).to.equal(false);
		});

		it('checkForUpdate with different version file and package.json (dev environment)', async () => {
			const installPath = path.join(os.homedir(), '.appcelerator', 'install');
			mockFS({
				[installPath]: {
					'.version': '6.6.6',
					'6.6.6': {
						package: {
							'package.json': '{ "version": "4.2.0" }'
						}
					}
				},
			});
			mockAppcCoreRequest('6.6.6');

			const update = await appc.core.checkForUpdate();
			expect(update.currentVersion).to.equal('4.2.0');
			expect(update.latestVersion).to.equal('6.6.6');
			expect(update.productName).to.equal('Appcelerator CLI');
			expect(update.hasUpdate).to.equal(true);
		});
	});

	describe('node', () => {
		it('validateEnvironment with no node installed', async () => {
			const stub = global.sandbox.stub(util, 'exec');
			mockNode(stub);

			const env = await node.checkInstalledVersion();
			expect(env).to.equal(undefined);
		});

		it('validateEnvironment with node installed', async () => {
			const stub = global.sandbox.stub(util, 'exec');
			mockNode(stub, 'v12.18.1');

			const env = await node.checkInstalledVersion();
			expect(env).to.deep.equal('12.18.1');
		});

		it('validateEnvironment with new supported SDK ranges', async () => {
			const stub = global.sandbox.stub(util, 'exec');
			mockNode(stub, 'v8.7.0');

			const env = await node.checkInstalledVersion();
			expect(env).to.deep.equal('8.7.0');
		});

		it('Get update with older version (v8.7.0)', async () => {
			mockNodeRequest();
			const stub = global.sandbox.stub(util, 'exec');
			mockNode(stub, 'v8.7.0');

			const url = await node.checkLatestVersion();
			expect(url).to.deep.equal('12.18.2');

		});

		it('Check for update with update available', async () => {
			mockNodeRequest();

			const stub = global.sandbox.stub(util, 'exec');
			mockNode(stub, 'v12.18.1');

			const update = await node.checkForUpdate();

			expect(update.currentVersion).to.deep.equal('12.18.1');
			expect(update.latestVersion).to.deep.equal('12.18.2');
			expect(update.action).to.be.instanceOf(Function);
			expect(update.productName).to.deep.equal('Node.js');
			expect(update.priority).to.deep.equal(1);
			expect(update.hasUpdate).to.deep.equal(true);
		});

		it('Check for update with up to date version', async () => {
			mockNodeRequest();

			const stub = global.sandbox.stub(util, 'exec');
			mockNode(stub, 'v12.18.2');

			const update = await node.checkForUpdate();

			expect(update.currentVersion).to.deep.equal('12.18.2');
			expect(update.latestVersion).to.deep.equal('12.18.2');
			expect(update.action).to.be.instanceOf(Function);
			expect(update.productName).to.deep.equal('Node.js');
			expect(update.priority).to.deep.equal(1);
			expect(update.hasUpdate).to.deep.equal(false);

		});

		it('Get node release notes', async () => {
			const url = await node.getReleaseNotes('v10.13.0');
			expect(url).to.deep.equal('https://nodejs.org/en/blog/release/v10.13.0/');
		});

		it('should fail if sudo require', async () => {
			mockNodeRequest();
			fixProcessPlatform = mockOS('darwin');
			const stub = global.sandbox.stub(execa, 'command');
			stub
				.withArgs(global.sandbox.match.any, global.sandbox.match.any)
				.rejects({ stdout: 'installer: must be run as root to install this package' } as execa.ExecaReturnValue);

			try {
				await node.installUpdate('1.2.3');
			} catch (error) {
				expect(error).to.be.instanceOf(util.InstallError);
				expect(error.metadata.errorCode).to.equal('EACCES');
				expect(error.metadata.command).to.match(/installer -pkg \S+ -target \//);
				return;
			}
			throw new Error('installUpdate did not throw');
		});
	});

	describe('alloy', () => {
		it('checkForUpdates with no core', async () => {
			mockNpmRequest();
			const stub = global.sandbox.stub(util, 'exec');
			mockNpmCli(stub, 'alloy', '1.15.2');

			const update = await alloy.checkForUpdate();

			expect(update.currentVersion).to.equal('1.15.2');
			expect(update.latestVersion).to.equal('1.15.4');
			expect(update.productName).to.equal('Alloy');
			expect(update.hasUpdate).to.equal(true);
		});

		it('checkForUpdates with no install', async () => {
			mockNpmRequest();
			const stub = global.sandbox.stub(util, 'exec');
			mockNpmCli(stub, 'alloy', undefined);

			const update = await alloy.checkForUpdate();

			expect(update.currentVersion).to.equal(undefined);
			expect(update.latestVersion).to.equal('1.15.4');
			expect(update.productName).to.equal('Alloy');
			expect(update.hasUpdate).to.equal(true);
		});

		it('checkForUpdates with latest already', async () => {
			mockNpmRequest();
			const stub = global.sandbox.stub(util, 'exec');
			mockNpmCli(stub, 'alloy', '1.15.4');

			const update = await alloy.checkForUpdate();

			expect(update.currentVersion).to.equal('1.15.4');
			expect(update.latestVersion).to.equal('1.15.4');
			expect(update.productName).to.equal('Alloy');
			expect(update.hasUpdate).to.equal(false);
		});

		it('install', async () => {
			const stub = global.sandbox.stub(util, 'exec');
			mockNpmInstall(stub, 'alloy', '1.15.14');
			await alloy.installUpdate('1.15.14');
		});

		it('install with sudo', async () => {
			const stub = global.sandbox.stub(execa, 'command');
			mockNpmInstall(stub, 'alloy', '1.15.14', true);

			try {
				await alloy.installUpdate('1.15.14');
			} catch (error) {
				expect(error).to.be.instanceOf(util.InstallError);
				expect(error.metadata.errorCode).to.equal('EACCES');
				expect(error.metadata.command).to.equal('npm install -g alloy@1.15.14 --json');
				return;
			}
			throw new Error('installUpdate did not throw');
		});
	});

	describe('titanium.cli', () => {
		it('checkForUpdates with no core', async () => {
			mockNpmRequest();
			const stub = global.sandbox.stub(util, 'exec');
			mockNpmCli(stub, 'titanium', '5.2.4');

			const update = await titanium.cli.checkForUpdate();

			expect(update.currentVersion).to.equal('5.2.4');
			expect(update.latestVersion).to.equal('5.3.0');
			expect(update.productName).to.equal('Titanium CLI');
			expect(update.hasUpdate).to.equal(true);
		});

		it('checkForUpdates with no install', async () => {
			mockNpmRequest();

			const stub = global.sandbox.stub(util, 'exec');

			mockNpmCli(stub, 'titanium', undefined);

			const update = await titanium.cli.checkForUpdate();

			expect(update.currentVersion).to.equal(undefined);
			expect(update.latestVersion).to.equal('5.3.0');
			expect(update.productName).to.equal('Titanium CLI');
			expect(update.hasUpdate).to.equal(true);
		});

		it('checkForUpdates with latest already', async () => {
			mockNpmRequest();
			const stub = global.sandbox.stub(util, 'exec');

			mockNpmCli(stub, 'titanium', '5.3.0');

			const update = await titanium.cli.checkForUpdate();

			expect(update.currentVersion).to.equal('5.3.0');
			expect(update.latestVersion).to.equal('5.3.0');
			expect(update.productName).to.equal('Titanium CLI');
			expect(update.hasUpdate).to.equal(false);
		});

		it('install', async () => {
			const stub = global.sandbox.stub(util, 'exec');
			mockNpmInstall(stub, 'titanium', '5.3.0');
			await titanium.cli.installUpdate('5.3.0');
		});

		it('install with sudo', async () => {
			const stub = global.sandbox.stub(execa, 'command');
			mockNpmInstall(stub, 'titanium', '5.3.0', true);

			try {
				await titanium.cli.installUpdate('5.3.0');
			} catch (error) {
				expect(error).to.be.instanceOf(util.InstallError);
				expect(error.metadata.errorCode).to.equal('EACCES');
				expect(error.metadata.command).to.equal('npm install -g titanium@5.3.0 --json');
				return;
			}
			throw new Error('installUpdate did not throw');
		});
	});

	describe('checkforUpdates', () => {
		it('useAppcTooling false', async () => {
			const stub = global.sandbox.stub(util, 'exec');
			mockNodeRequest();
			mockSDKRequest();
			mockNpmRequest();
			mockSdk('8.0.0');
			mockNode(stub, '12.18.2');
			mockNpmCli(stub, 'alloy', '1.15.4');
			mockNpmCli(stub, 'titanium', '5.3.0');

			const updates = await checkAllUpdates({}, false);
			expect(updates.length).to.equal(0);
		});
	});
});
