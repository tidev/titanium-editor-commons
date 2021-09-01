import * as path from 'path';
import * as util from '../src/util';

import execa from 'execa';
import { appc, titanium, node, alloy, checkAllUpdates } from '../src/updates/';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import mockFS from 'mock-fs';
import nock from 'nock';
import os from 'os';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { mockAppcCoreRequest, mockNpmRequest, mockNodeRequest } from './fixtures/network/network-mocks';
import { mockAppcCli, mockNode, mockNpmCli, mockNpmInstall, mockOS, mockSdkList, mockSdkListReleases, mockSdkInstall } from './util';

chai.use(chaiAsPromised);
chai.use(sinonChai);
const expect = chai.expect;

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
			const stub: sinon.SinonStub = global.sandbox.stub(util, 'exec');

			mockSdkList(stub, '7.5.0');
			mockSdkListReleases(stub);

			const update = await titanium.sdk.checkForUpdate();
			expect(update.currentVersion).to.equal('7.5.0.GA');
			expect(update.latestVersion).to.equal('8.0.0.GA');
			expect(update.productName).to.equal('Titanium SDK');
			expect(update.hasUpdate).to.equal(true);
		});

		it('checkForUpdate with no installed SDKS', async () => {
			const stub: sinon.SinonStub = global.sandbox.stub(util, 'exec');

			mockSdkList(stub, undefined);
			mockSdkListReleases(stub);

			const update = await titanium.sdk.checkForUpdate();
			expect(update.currentVersion).to.equal('');
			expect(update.latestVersion).to.equal('8.0.0.GA');
			expect(update.productName).to.equal('Titanium SDK');
			expect(update.hasUpdate).to.equal(true);
		});

		it('checkForUpdate with latest installed', async () => {
			const stub: sinon.SinonStub = global.sandbox.stub(util, 'exec');

			mockSdkList(stub, '8.0.0');
			mockSdkListReleases(stub);

			const update = await titanium.sdk.checkForUpdate();
			expect(update.currentVersion).to.equal('8.0.0.GA');
			expect(update.latestVersion).to.equal('8.0.0.GA');
			expect(update.productName).to.equal('Titanium SDK');
			expect(update.hasUpdate).to.equal(false);
		});

		it('install with titanium cli', async () => {
			const execStub: sinon.SinonStub = global.sandbox.stub(util, 'exec');
			mockSdkInstall(execStub, '8.0.0.GA', false);

			await titanium.sdk.installUpdate('8.0.0.GA');
			const installCall = execStub.getCall(1);
			expect(installCall.args).to.deep.equal([ 'ti', [ 'sdk', 'install', '8.0.0.GA', '--default' ], { shell: true } ]);
		});

		it('install with appc cli logged in', async () => {
			const execStub: sinon.SinonStub = global.sandbox.stub(util, 'exec');
			mockSdkInstall(execStub, '8.0.0.GA', true);

			const whoamiStub = execStub
				.withArgs('appc', [ 'whoami', '-o', 'json' ], sinon.match.any)
				.resolves({ stdout: '{ "username": "bob" }' } as execa.ExecaReturnValue);

			mockNpmCli(execStub, 'titanium');
			mockAppcCli(execStub, '6.6.6', '4.2.13');

			await titanium.sdk.installUpdate('8.0.0.GA');

			expect(whoamiStub).to.have.been.calledOnceWith('appc', [ 'whoami', '-o', 'json' ], { shell: true });
			const installCall = execStub.getCall(2);
			expect(installCall.args).to.deep.equal([ 'appc', [ 'ti', 'sdk', 'install', '8.0.0.GA', '--default' ], { shell: true } ]);
		});

		it('install with appc cli logged out', async () => {
			const execStub: sinon.SinonStub = global.sandbox.stub(util, 'exec');
			mockSdkInstall(execStub, '8.0.0.GA', true);

			execStub
				.withArgs('appc', [ 'whoami', '-o', 'json' ], sinon.match.any)
				.resolves({ stdout: '{}' } as execa.ExecaReturnValue);

			mockNpmCli(execStub, 'titanium');
			mockAppcCli(execStub, '6.6.6', '4.2.13');

			await expect(titanium.sdk.installUpdate('8.0.0.GA')).to.eventually.be.rejectedWith('Failed to run appc cli as you are not logged in');
		});

		it('getReleaseNotes()', () => {
			expect(titanium.sdk.getReleaseNotes('10.0.0.GA')).to.equal('https://titaniumsdk.com/guide/Titanium_SDK/Titanium_SDK_Release_Notes/Titanium_SDK_Release_Notes_10.x/Titanium_SDK_10.0.0.GA_Release_Note.html');
		});

		it('getReleaseNotes() should throw if cant determine major version', () => {
			expect(() => titanium.sdk.getReleaseNotes('foo')).to.throw(Error, 'Failed to parse major version from foo');
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

		it('installUpdate()', async () => {
			const stub = global.sandbox.stub(util, 'exec')
				.withArgs('npm', sinon.match.any, sinon.match.any)
				.resolves({ stdout: '' } as execa.ExecaReturnValue);

			await appc.install.installUpdate('6.6.6');

			expect(stub).to.have.been.calledOnceWith('npm', [ 'install', '-g', 'appcelerator@6.6.6', '--json' ], { shell: true });
		});

		it('getReleaseNotes()', () => {
			expect(appc.install.getReleaseNotes()).to.equal('https://titaniumsdk.com/guide/Appcelerator_CLI/Appcelerator_CLI_Release_Notes/');
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

		it('installUpdate()', async () => {
			const stub = global.sandbox.stub(util, 'exec')
				.withArgs('appc', sinon.match.any, sinon.match.any)
				.resolves({ stdout: '' } as execa.ExecaReturnValue);

			await appc.core.installUpdate('6.6.6');

			expect(stub).to.have.been.calledOnceWith('appc', [ 'use', '6.6.6' ], { shell: true });
		});

		it('getReleaseNotes()', () => {
			expect(appc.core.getReleaseNotes('6.6.6')).to.equal('https://titaniumsdk.com/guide/Appcelerator_CLI/Appcelerator_CLI_Release_Notes/Appcelerator_CLI_Release_Notes_6.x/Appcelerator_CLI_6.6.6_GA_Release_Note.html');
		});

		it('getReleaseNotes() should throw if cant determine major version', () => {
			expect(() => appc.core.getReleaseNotes('foo')).to.throw(Error, 'Failed to parse major version from foo');
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

		(process.platform === 'darwin' ? it : it.skip)('should fail if sudo required', async () => {
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
				expect((error as util.InstallError).metadata.errorCode).to.equal('EACCES');
				expect((error as util.InstallError).metadata.command).to.match(/installer -pkg \S+ -target \//);
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
				expect((error as util.InstallError).metadata.errorCode).to.equal('EACCES');
				expect((error as util.InstallError).metadata.command).to.equal('npm install -g alloy@1.15.14 --json');
				return;
			}
			throw new Error('installUpdate did not throw');
		});

		it('getReleaseNotes()', () => {
			expect(alloy.getReleaseNotes('1.16.3')).to.equal('https://github.com/appcelerator/alloy/releases/tag/1.16.3');
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
				expect((error as util.InstallError).metadata.errorCode).to.equal('EACCES');
				expect((error as util.InstallError).metadata.command).to.equal('npm install -g titanium@5.3.0 --json');
				return;
			}
			throw new Error('installUpdate did not throw');
		});

		it('getReleaseNotes()', () => {
			expect(titanium.cli.getReleaseNotes('5.3.2')).to.equal('https://github.com/appcelerator/titanium/releases/tag/5.3.2');
		});
	});

	describe('checkforUpdates', () => {
		it('useAppcTooling false no updates', async () => {
			const stub = global.sandbox.stub(util, 'exec');
			mockNodeRequest();
			mockSdkListReleases(stub);
			mockNpmRequest();
			mockSdkList(stub, '8.0.0');
			mockNode(stub, '12.18.2');
			mockNpmCli(stub, 'alloy', '1.15.4');
			mockNpmCli(stub, 'titanium', '5.3.0');

			const updates = await checkAllUpdates({}, false);
			expect(updates.length).to.equal(0);
		});

		it('useAppcTooling false with updates', async () => {
			const stub = global.sandbox.stub(util, 'exec');
			mockNodeRequest();
			mockSdkListReleases(stub);
			mockNpmRequest();
			mockSdkList(stub, '8.0.0');
			mockNode(stub, '12.18.1');
			mockNpmCli(stub, 'alloy', '1.15.3');
			mockNpmCli(stub, 'titanium', '5.3.0');

			const updates = await checkAllUpdates({}, false);
			expect(updates.length).to.equal(2);

			expect(updates[0].productName).to.equal('Node.js');
			expect(updates[0].currentVersion).to.equal('12.18.1');
			expect(updates[0].latestVersion).to.equal('12.18.2');

			expect(updates[1].productName).to.equal('Alloy');
			expect(updates[1].currentVersion).to.equal('1.15.3');
			expect(updates[1].latestVersion).to.equal('1.15.4');
		});

		it('useAppcTooling true no updates', async () => {
			const stub = global.sandbox.stub(util, 'exec');
			mockNodeRequest();
			mockSdkListReleases(stub);
			mockNpmRequest();
			mockSdkList(stub, '8.0.0');
			mockNode(stub, '12.18.2');
			mockAppcCoreRequest('6.6.6');
			mockAppcCli(stub, '6.6.6', '4.2.13', true);

			const updates = await checkAllUpdates({}, true);
			expect(updates.length).to.equal(0);
		});

		it('useAppcTooling true with updates', async () => {
			const stub = global.sandbox.stub(util, 'exec');
			mockNodeRequest();
			mockSdkListReleases(stub);
			mockNpmRequest();
			mockSdkList(stub, '8.0.0');
			mockNode(stub, '12.18.1');
			mockAppcCoreRequest('6.6.6');
			mockAppcCli(stub, '6.6.6', '4.2.12', true);

			const updates = await checkAllUpdates({}, true);
			expect(updates.length).to.equal(2);

			expect(updates[0].productName).to.equal('Node.js');
			expect(updates[0].currentVersion).to.equal('12.18.1');
			expect(updates[0].latestVersion).to.equal('12.18.2');

			expect(updates[1].productName).to.equal('Appcelerator CLI (npm)');
			expect(updates[1].currentVersion).to.equal('4.2.12');
			expect(updates[1].latestVersion).to.equal('4.2.13');
		});
	});
});
