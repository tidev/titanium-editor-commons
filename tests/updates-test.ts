/* eslint @typescript-eslint/camelcase: off */

import { appc, titanium, node } from '../src/updates/';

import * as titaniumlib from 'titaniumlib';

import { expect } from 'chai';
import child_process from 'child_process';
import { EventEmitter } from 'events';
import mockFS from 'mock-fs';
import nock from 'nock';
import os from 'os';
import * as path from 'path';
import stream from 'stream';
import { mockAppcCoreRequest, mockNpmRequest, mockSDKRequest } from './fixtures/network/network-mocks';

function createChildMock (): child_process.ChildProcess {
	const fakeChild = new EventEmitter() as child_process.ChildProcess;
	fakeChild.stdout = new EventEmitter() as stream.Readable;
	fakeChild.stderr = new EventEmitter() as stream.Readable;
	return fakeChild;
}

describe('updates', () => {

	beforeEach(() => {
		mockFS.restore();
	});

	afterEach(() => {
		nock.cleanAll();
		mockFS.restore();
	});

	describe('titanium.sdk', () => {
		it('checkForUpdate with installed SDKS', async () => {
			const sdkStub = global.sandbox.stub(titaniumlib.sdk, 'getInstalledSDKs');

			sdkStub.returns([
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
					name: '7.5.0.GA',
					manifest: {
						name: '7.5.0.v20181115134726',
						version: '7.5.0',
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
					path: '/Users/eharris/Library/Application Support/Titanium/mobilesdk/osx/7.5.0.GA'
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

			mockSDKRequest('sdk-response.json');

			const update = await titanium.sdk.checkForUpdate();
			expect(update.currentVersion).to.equal('7.5.0.GA');
			expect(update.latestVersion).to.equal('8.0.0.GA');
			expect(update.productName).to.equal('Titanium SDK');
			expect(update.hasUpdate).to.equal(true);
		});

		it('checkForUpdate with no installed SDKS', async () => {
			const sdkStub = global.sandbox.stub(titaniumlib.sdk, 'getInstalledSDKs');

			sdkStub.returns([]);

			mockSDKRequest('sdk-response.json');

			const update = await titanium.sdk.checkForUpdate();
			expect(update.currentVersion).to.equal('');
			expect(update.latestVersion).to.equal('8.0.0.GA');
			expect(update.productName).to.equal('Titanium SDK');
			expect(update.hasUpdate).to.equal(true);
		});

		it('checkForUpdate with latest installed', async () => {
			const sdkStub = global.sandbox.stub(titaniumlib.sdk, 'getInstalledSDKs');

			sdkStub.returns([
				{
					name: '8.0.0.GA',
					manifest: {
						name: '8.0.0.v20190314105657',
						version: '8.0.0',
						moduleAPIVersion: {
							iphone: '2',
							android: '4',
							windows: '7'
						},
						githash: '3726240fa2',
						platforms: [
							'iphone',
							'android'
						],
						timestamp: '4/2/2019 17:36'
					},
					path: '/Users/eharris/Library/Application Support/Titanium/mobilesdk/osx/8.0.0.GA'
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
			const appcChild = createChildMock();
			global.sandbox.stub(child_process, 'spawn')
				.withArgs('appc')
				.returns(appcChild);

			setTimeout(() => {
				appcChild.stdout.emit('data', '{"NPM":"4.2.12","CLI":"7.1.0-master.13"}');
				appcChild.emit('close', 0);
			}, 500);
			const update = await appc.install.checkForUpdate();

			expect(update.currentVersion).to.equal('4.2.12');
			expect(update.latestVersion).to.equal('4.2.13');
			expect(update.productName).to.equal('Appcelerator CLI (npm)');
			expect(update.hasUpdate).to.equal(true);
		});

		it('checkForUpdates with no core', async () => {

			mockNpmRequest();
			const appcChild = createChildMock();
			const npmChild = createChildMock();

			const stub = global.sandbox.stub(child_process, 'spawn');

			stub
				.withArgs('appc')
				.returns(appcChild);

			stub
				.withArgs('npm')
				.returns(npmChild);

			setTimeout(() => {
				appcChild.stderr.emit('data', '/bin/sh: appc: command not found\n');
				appcChild.emit('close', 127);
			}, 500);

			setTimeout(() => {
				npmChild.stdout.emit('data', `{
					"dependencies": {
					  "appcelerator": {
						"version": "4.2.12",
						"from": "appcelerator@4.2.11",
						"resolved": "https://registry.npmjs.org/appcelerator/-/appcelerator-4.2.11.tgz"
					  }
					}
				  }`);
				npmChild.emit('close', 0);
			}, 750);

			const update = await appc.install.checkForUpdate();

			expect(update.currentVersion).to.equal('4.2.12');
			expect(update.latestVersion).to.equal('4.2.13');
			expect(update.productName).to.equal('Appcelerator CLI (npm)');
			expect(update.hasUpdate).to.equal(true);
		});

		it('checkForUpdates with no install', async () => {
			mockNpmRequest();
			const appcChild = createChildMock();
			const npmChild = createChildMock();

			const stub = global.sandbox.stub(child_process, 'spawn');

			stub
				.withArgs('appc')
				.returns(appcChild);

			stub
				.withArgs('npm')
				.returns(npmChild);

			setTimeout(() => {
				appcChild.stderr.emit('data', '/bin/sh: appc: command not found');
				appcChild.emit('close', 127);
			}, 500);

			setTimeout(() => {
				npmChild.stdout.emit('data', '{}');
				npmChild.emit('close', 0);
			}, 750);

			const update = await appc.install.checkForUpdate();

			expect(update.currentVersion).to.equal(undefined);
			expect(update.latestVersion).to.equal('4.2.13');
			expect(update.productName).to.equal('Appcelerator CLI (npm)');
			expect(update.hasUpdate).to.equal(true);
		});

		it('checkForUpdates with latest already', async () => {
			mockNpmRequest();
			const appcChild = createChildMock();
			global.sandbox.stub(child_process, 'spawn')
				.returns(appcChild);
			setTimeout(() => {
				appcChild.stdout.emit('data', '{"NPM":"4.2.13","CLI":"7.1.0-master.13"}');
				appcChild.emit('close', 0);
			}, 500);
			const update = await appc.install.checkForUpdate();

			expect(update.currentVersion).to.equal('4.2.13');
			expect(update.latestVersion).to.equal('4.2.13');
			expect(update.productName).to.equal('Appcelerator CLI (npm)');
			expect(update.hasUpdate).to.equal(false);
		});
	});

	describe('appc.core', () => {
		it('checkForUpdate with install', async () => {
			const installPath = path.join(os.homedir(), '.appcelerator', 'install');

			mockFS({
				[installPath]: {
					'.version': '4.2.0',
					'4.2.0': {
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

		it('checkForUpdate with no install', async () => {
			mockFS({});
			mockAppcCoreRequest('6.6.6');
			const update = await appc.core.checkForUpdate();
			expect(update.currentVersion).to.equal(undefined);
			expect(update.latestVersion).to.equal('6.6.6');
			expect(update.productName).to.equal('Appcelerator CLI');
			expect(update.hasUpdate).to.equal(true);
		});

		it('checkForUpdate with latest installed', async () => {
			const installPath = path.join(os.homedir(), '.appcelerator', 'install');

			mockFS({
				[installPath]: {
					'.version': '6.6.6',
					'6.6.6': {
						package: {
							'package.json': '{ "version": "6.6.6" }'
						}
					}
				},
			});

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
	describe('node.installer', () => {
		it('validateEnvironment with no node installed', async () => {

			global.sandbox.stub(child_process, 'exec').yields(new Error('Please install node to continue.'));

			const env = await node.install.checkNodeInstalled();
			expect(env).to.equal(false);

		});
		it('validateEnvironment with node installed', async () => {

			global.sandbox.stub(child_process, 'exec').yields(null, 'v12.18.1');

			const env = await node.install.checkNodeVersion();
			expect(env).to.deep.equal('v12.18.1');

		});
		it('validateEnvironment with older version of node', async () => {

			global.sandbox.stub(child_process, 'exec').yields(null, 'v8.7.0');

			try {
				await node.install.checkNodeVersion();
			} catch (error) {
				expect(error).to.be.instanceOf(Error);
				expect(error.message).to.equal('Please install node to continue.');
			}

		});
		it('Get node version Url', async () => {

			const url = await node.install.getNodeVersionUrl('v12.18.1');
			expect(url).to.deep.equal('https://nodejs.org/dist/v12.18.1/');

		});
	});
});

