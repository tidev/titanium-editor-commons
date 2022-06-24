import * as util from '../src/util';

import execa from 'execa';
import { titanium, node, alloy, checkAllUpdates } from '../src/updates/';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import mockFS from 'mock-fs';
import nock from 'nock';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { mockNpmRequest, mockNodeRequest } from './fixtures/network/network-mocks';
import { mockNode, mockNpmCli, mockNpmInstall, mockOS, mockSdkList, mockSdkListReleases, mockSdkInstall } from './util';

chai.use(chaiAsPromised);
chai.use(sinonChai);
const expect = chai.expect;

let fixProcessPlatform: () => void|undefined;
let sandbox: sinon.SinonSandbox;
describe('updates', () => {

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		mockFS.restore();
	});

	afterEach(() => {
		nock.cleanAll();
		mockFS.restore();
		fixProcessPlatform?.();
		sandbox.restore();
	});

	describe('titanium.sdk', () => {
		it('checkForUpdate with installed SDKS', async () => {
			const stub: sinon.SinonStub = sandbox.stub(util, 'exec');

			mockSdkList(stub, '7.5.0');
			mockSdkListReleases(stub);

			const update = await titanium.sdk.checkForUpdate();
			expect(update.currentVersion).to.equal('7.5.0.GA');
			expect(update.latestVersion).to.equal('8.0.0.GA');
			expect(update.productName).to.equal('Titanium SDK');
			expect(update.hasUpdate).to.equal(true);
		});

		it('checkForUpdate with no installed SDKS', async () => {
			const stub: sinon.SinonStub = sandbox.stub(util, 'exec');

			mockSdkList(stub, undefined);
			mockSdkListReleases(stub);

			const update = await titanium.sdk.checkForUpdate();
			expect(update.currentVersion).to.equal(undefined);
			expect(update.latestVersion).to.equal('8.0.0.GA');
			expect(update.productName).to.equal('Titanium SDK');
			expect(update.hasUpdate).to.equal(true);
		});

		it('checkForUpdate with latest installed', async () => {
			const stub: sinon.SinonStub = sandbox.stub(util, 'exec');

			mockSdkList(stub, '8.0.0');
			mockSdkListReleases(stub);

			const update = await titanium.sdk.checkForUpdate();
			expect(update.currentVersion).to.equal('8.0.0.GA');
			expect(update.latestVersion).to.equal('8.0.0.GA');
			expect(update.productName).to.equal('Titanium SDK');
			expect(update.hasUpdate).to.equal(false);
		});

		it('checkForUpdate with no CLI installed', async () => {
			const stub: sinon.SinonStub = sandbox.stub(util, 'exec');

			mockSdkList(stub, '8.0.0');
			mockSdkListReleases(stub);
			mockNpmCli(stub, 'titanium', undefined);

			const update = await titanium.sdk.checkForUpdate();
			expect(update.currentVersion).to.equal(undefined);
			expect(update.latestVersion).to.equal('latest');
			expect(update.productName).to.equal('Titanium SDK');
			expect(update.hasUpdate).to.equal(true);
		});

		it('install with titanium cli', async () => {
			const execStub: sinon.SinonStub = sandbox.stub(util, 'exec');
			mockSdkInstall(execStub, '8.0.0.GA');

			await titanium.sdk.installUpdate('8.0.0.GA');
			const installCall = execStub.getCall(1);
			expect(installCall.args).to.deep.equal([ 'ti', [ 'sdk', 'install', '8.0.0.GA', '--default' ], { shell: true } ]);
		});

		it('getReleaseNotes()', () => {
			expect(titanium.sdk.getReleaseNotes('10.0.0.GA')).to.equal('https://titaniumsdk.com/guide/Titanium_SDK/Titanium_SDK_Release_Notes/Titanium_SDK_Release_Notes_10.x/Titanium_SDK_10.0.0.GA_Release_Note.html');
		});

		it('getReleaseNotes() should throw if cant determine major version', () => {
			expect(() => titanium.sdk.getReleaseNotes('foo')).to.throw(Error, 'Failed to parse major version from foo');
		});

		it('should handle active sdk not matching', async () => {
			const stub: sinon.SinonStub = sandbox.stub(util, 'exec');

			mockSdkList(stub, '8.0.0', '7.0.0');
			mockSdkListReleases(stub);

			expect(titanium.sdk.checkForUpdate()).to.eventually.throw(util.CustomError, 'Selected SDK 7.0.0.GA is not installed');
		});

		it('should handle active sdk not matching and no sdk installed', async () => {
			const stub: sinon.SinonStub = sandbox.stub(util, 'exec');

			mockSdkList(stub, undefined, '7.0.0');
			mockSdkListReleases(stub);

			expect(titanium.sdk.checkForUpdate()).to.eventually.throw(util.CustomError, 'Selected SDK 7.0.0.GA is not installed');
		});
	});

	describe('node', () => {
		it('validateEnvironment with no node installed', async () => {
			const stub = sandbox.stub(util, 'exec');
			mockNode(stub);

			const env = await node.checkInstalledVersion();
			expect(env).to.equal(undefined);
		});

		it('validateEnvironment with node installed', async () => {
			const stub = sandbox.stub(util, 'exec');
			mockNode(stub, 'v12.18.1');

			const env = await node.checkInstalledVersion();
			expect(env).to.deep.equal('12.18.1');
		});

		it('validateEnvironment with new supported SDK ranges', async () => {
			const stub = sandbox.stub(util, 'exec');
			mockNode(stub, 'v8.7.0');

			const env = await node.checkInstalledVersion();
			expect(env).to.deep.equal('8.7.0');
		});

		it('Get update with older version (v8.7.0)', async () => {
			mockNodeRequest();
			const stub = sandbox.stub(util, 'exec');
			mockNode(stub, 'v8.7.0');

			const url = await node.checkLatestVersion();
			expect(url).to.deep.equal('12.18.2');

		});

		it('Check for update with update available', async () => {
			mockNodeRequest();

			const stub = sandbox.stub(util, 'exec');
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

			const stub = sandbox.stub(util, 'exec');
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
			const stub = sandbox.stub(execa, 'command');
			stub
				.withArgs(sandbox.match.any, sandbox.match.any)
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
		it('checkForUpdates with an update', async () => {
			mockNpmRequest();
			const stub = sandbox.stub(util, 'exec');
			mockNpmCli(stub, 'alloy', '1.15.2');

			const update = await alloy.checkForUpdate();

			expect(update.currentVersion).to.equal('1.15.2');
			expect(update.latestVersion).to.equal('1.15.4');
			expect(update.productName).to.equal('Alloy');
			expect(update.hasUpdate).to.equal(true);
		});

		it('checkForUpdates with no install', async () => {
			mockNpmRequest();
			const stub = sandbox.stub(util, 'exec');
			mockNpmCli(stub, 'alloy', undefined);

			const update = await alloy.checkForUpdate();

			expect(update.currentVersion).to.equal(undefined);
			expect(update.latestVersion).to.equal('1.15.4');
			expect(update.productName).to.equal('Alloy');
			expect(update.hasUpdate).to.equal(true);
		});

		it('checkForUpdates with latest already', async () => {
			mockNpmRequest();
			const stub = sandbox.stub(util, 'exec');
			mockNpmCli(stub, 'alloy', '1.15.4');

			const update = await alloy.checkForUpdate();

			expect(update.currentVersion).to.equal('1.15.4');
			expect(update.latestVersion).to.equal('1.15.4');
			expect(update.productName).to.equal('Alloy');
			expect(update.hasUpdate).to.equal(false);
		});

		it('install', async () => {
			const stub = sandbox.stub(util, 'exec');
			mockNpmInstall(stub, 'alloy', '1.15.14');
			await alloy.installUpdate('1.15.14');
		});

		it('install with sudo', async () => {
			const stub = sandbox.stub(execa, 'command');
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
			const stub = sandbox.stub(util, 'exec');
			mockNpmCli(stub, 'titanium', '5.2.4');

			const update = await titanium.cli.checkForUpdate();

			expect(update.currentVersion).to.equal('5.2.4');
			expect(update.latestVersion).to.equal('5.3.0');
			expect(update.productName).to.equal('Titanium CLI');
			expect(update.hasUpdate).to.equal(true);
		});

		it('checkForUpdates with no install', async () => {
			mockNpmRequest();

			const stub = sandbox.stub(util, 'exec');

			mockNpmCli(stub, 'titanium', undefined);

			const update = await titanium.cli.checkForUpdate();

			expect(update.currentVersion).to.equal(undefined);
			expect(update.latestVersion).to.equal('5.3.0');
			expect(update.productName).to.equal('Titanium CLI');
			expect(update.hasUpdate).to.equal(true);
		});

		it('checkForUpdates with latest already', async () => {
			mockNpmRequest();
			const stub = sandbox.stub(util, 'exec');

			mockNpmCli(stub, 'titanium', '5.3.0');

			const update = await titanium.cli.checkForUpdate();

			expect(update.currentVersion).to.equal('5.3.0');
			expect(update.latestVersion).to.equal('5.3.0');
			expect(update.productName).to.equal('Titanium CLI');
			expect(update.hasUpdate).to.equal(false);
		});

		it('install', async () => {
			const stub = sandbox.stub(util, 'exec');
			mockNpmInstall(stub, 'titanium', '5.3.0');
			await titanium.cli.installUpdate('5.3.0');
		});

		it('install with sudo', async () => {
			const stub = sandbox.stub(execa, 'command');
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
		// TODO rewrite
		it('useAppcTooling false no updates', async () => {
			const stub = sandbox.stub(util, 'exec');
			mockNodeRequest();
			mockSdkListReleases(stub);
			mockNpmRequest();
			mockSdkList(stub, '8.0.0');
			mockNode(stub, '12.18.2');
			mockNpmCli(stub, 'alloy', '1.15.4');
			mockNpmCli(stub, 'titanium', '5.3.0');

			const updates = await checkAllUpdates({});
			expect(updates.length).to.equal(0);
		});

		it('useAppcTooling false with updates', async () => {
			const stub = sandbox.stub(util, 'exec');
			mockNodeRequest();
			mockSdkListReleases(stub);
			mockNpmRequest();
			mockSdkList(stub, '8.0.0');
			mockNode(stub, '12.18.1');
			mockNpmCli(stub, 'alloy', '1.15.3');
			mockNpmCli(stub, 'titanium', '5.3.0');

			const updates = await checkAllUpdates({});
			expect(updates.length).to.equal(2);

			expect(updates[0].productName).to.equal('Node.js');
			expect(updates[0].currentVersion).to.equal('12.18.1');
			expect(updates[0].latestVersion).to.equal('12.18.2');

			expect(updates[1].productName).to.equal('Alloy');
			expect(updates[1].currentVersion).to.equal('1.15.3');
			expect(updates[1].latestVersion).to.equal('1.15.4');
		});
	});
});
