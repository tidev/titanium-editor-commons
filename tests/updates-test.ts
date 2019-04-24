import { appc, titanium } from '../src/updates/';
import * as util from '../src/updates/util';

import * as titaniumlib from 'titaniumlib';

import { expect } from 'chai';
import nock from 'nock';
import * as path from 'path';
import * as sinon from 'sinon';
import * as os from 'os';
import mockFS from 'mock-fs'
import { mockAppcCoreRequest, mockSDKRequest, mockNpmRequest } from './fixtures/network/network-mocks';

const filePath = path.join(os.homedir(), '.appcelerator', 'install', '.version');
const FIXTURES_DIR = path.join(__dirname, 'fixtures');

describe('updates', () => {

	beforeEach(() => {
		mockFS.restore();
	})

	afterEach(() => {
		nock.cleanAll();
		sinon.restore();
		mockFS.restore();
	});

	describe('titanium.sdk', () => {
		it('checkForUpdate with installed SDKS', async function () {
			const sdkStub = sinon.stub(titaniumlib.sdk, 'getInstalledSDKs');

			sdkStub.returns([
				{
					"name": "7.0.2.GA",
					"manifest": {
						"name": "7.0.2.v20180209105903",
						"version": "7.0.2",
						"moduleAPIVersion": {
							"iphone": "2",
							"android": "4",
							"windows": "4"
						},
						"timestamp": "2/9/2018 19:05",
						"githash": "5ef0c56",
						"platforms": [
							"iphone",
							"android"
						]
					},
					"path": "/Users/eharris/Library/Application Support/Titanium/mobilesdk/osx/7.0.2.GA"
				},
				{
					"name": "7.5.0.GA",
					"manifest": {
						"name": "7.5.0.v20181115134726",
						"version": "7.5.0",
						"moduleAPIVersion": {
							"iphone": "2",
							"android": "4",
							"windows": "6"
						},
						"timestamp": "11/15/2018 21:52",
						"githash": "2e5a7423d0",
						"platforms": [
							"iphone",
							"android"
						]
					},
					"path": "/Users/eharris/Library/Application Support/Titanium/mobilesdk/osx/7.5.0.GA"
				},
				{
					"name": "8.1.0.v20190416065710",
					"manifest": {
						"name": "8.1.0.v20190416065710",
						"version": "8.1.0",
						"moduleAPIVersion": {
							"iphone": "2",
							"android": "4",
							"windows": "7"
						},
						"timestamp": "4/16/2019 14:03",
						"githash": "37f6d88",
						"platforms": [
							"iphone",
							"android"
						]
					},
					"path": "/Users/eharris/Library/Application Support/Titanium/mobilesdk/osx/8.1.0.v20190416065710"
				}
			]);

			mockSDKRequest('sdk-response.json');

			const update = await titanium.sdk.checkForUpdate();
			expect(update.currentVersion).to.equal('7.5.0.GA');
			expect(update.latestVersion).to.equal('8.0.0.GA');
			expect(update.productName).to.equal('Titanium SDK');
			expect(update.hasUpdate).to.equal(true);
		});

		it('checkForUpdate with no installed SDKS', async function () {
			const sdkStub = sinon.stub(titaniumlib.sdk, 'getInstalledSDKs');

			sdkStub.returns([]);

			mockSDKRequest('sdk-response.json');

			const update = await titanium.sdk.checkForUpdate();
			expect(update.currentVersion).to.equal('');
			expect(update.latestVersion).to.equal('8.0.0.GA');
			expect(update.productName).to.equal('Titanium SDK');
			expect(update.hasUpdate).to.equal(true);
		});

		it('checkForUpdate with latest installed', async function () {
			const sdkStub = sinon.stub(titaniumlib.sdk, 'getInstalledSDKs');

			sdkStub.returns([
				{
					"name": "8.0.0.GA",
					"manifest": {
						"name": "8.0.0.v20190314105657",
						"version": "8.0.0",
						"moduleAPIVersion": {
							"iphone": "2",
							"android": "4",
							"windows": "7"
						},
						"githash": "3726240fa2",
						"platforms": [
							"iphone",
							"android"
						]
					},
					"path": "/Users/eharris/Library/Application Support/Titanium/mobilesdk/osx/8.0.0.GA"
				},
				{
					"name": "8.1.0.v20190416065710",
					"manifest": {
						"name": "8.1.0.v20190416065710",
						"version": "8.1.0",
						"moduleAPIVersion": {
							"iphone": "2",
							"android": "4",
							"windows": "7"
						},
						"timestamp": "4/16/2019 14:03",
						"githash": "37f6d88",
						"platforms": [
							"iphone",
							"android"
						]
					},
					"path": "/Users/eharris/Library/Application Support/Titanium/mobilesdk/osx/8.1.0.v20190416065710"
				}
			]);

			mockSDKRequest('sdk-response.json');

			const update = await titanium.sdk.checkForUpdate();
			expect(update.currentVersion).to.equal('8.0.0.GA');
			expect(update.latestVersion).to.equal('8.0.0.GA');
			expect(update.productName).to.equal('Titanium SDK');
			expect(update.hasUpdate).to.equal(false);
		});
	});

	describe('appc.installer', () => {
		it('checkForUpdates with install', async () => {
			mockNpmRequest();
			const versionStub = sinon.stub(util, 'getNpmPackagePath');
			versionStub.returns(path.join(FIXTURES_DIR, 'appcelerator', '4.2.12', 'package.json'));
			const update = await appc.install.checkForUpdate();

			expect(update.currentVersion).to.equal('4.2.12');
			expect(update.latestVersion).to.equal('4.2.13');
			expect(update.productName).to.equal('Appcelerator CLI (npm)');
			expect(update.hasUpdate).to.equal(true);
		});

		it('checkForUpdates with no install', async () => {
			mockNpmRequest();
			const versionStub = sinon.stub(util, 'getNpmPackagePath');
			versionStub.returns(path.join(FIXTURES_DIR, 'noExist'));
			const update = await appc.install.checkForUpdate();

			expect(update.currentVersion).to.equal(undefined);
			expect(update.latestVersion).to.equal('4.2.13');
			expect(update.productName).to.equal('Appcelerator CLI (npm)');
			expect(update.hasUpdate).to.equal(true);
		});

		it('checkForUpdates with latest already', async () => {
			mockNpmRequest();
			const versionStub = sinon.stub(util, 'getNpmPackagePath');
			versionStub.returns(path.join(FIXTURES_DIR, 'appcelerator', '4.2.13', 'package.json'));
			const update = await appc.install.checkForUpdate();

			expect(update.currentVersion).to.equal('4.2.13');
			expect(update.latestVersion).to.equal('4.2.13');
			expect(update.productName).to.equal('Appcelerator CLI (npm)');
			expect(update.hasUpdate).to.equal(false);
		});
	});

	describe('appc.core', () => {
		it('checkForUpdate with install', async function () {
			mockFS({
				[filePath]: '4.2.0'
			});
			mockAppcCoreRequest('6.6.6');
			const update = await appc.core.checkForUpdate();
			expect(update.currentVersion).to.equal('4.2.0');
			expect(update.latestVersion).to.equal('6.6.6');
			expect(update.productName).to.equal('Appcelerator CLI');
			expect(update.hasUpdate).to.equal(true);
		});

		it('checkForUpdate with no install', async function () {
			mockFS({});
			mockAppcCoreRequest('6.6.6');
			const update = await appc.core.checkForUpdate();
			expect(update.currentVersion).to.equal(undefined);
			expect(update.latestVersion).to.equal('6.6.6');
			expect(update.productName).to.equal('Appcelerator CLI');
			expect(update.hasUpdate).to.equal(true);
		});

		it('checkForUpdate with latest installed', async function () {
			mockFS({
				[filePath]: '6.6.6'
			});
			mockAppcCoreRequest('6.6.6');
			const update = await appc.core.checkForUpdate();
			expect(update.currentVersion).to.equal('6.6.6');
			expect(update.latestVersion).to.equal('6.6.6');
			expect(update.productName).to.equal('Appcelerator CLI');
			expect(update.hasUpdate).to.equal(false);
		});
	});
});
