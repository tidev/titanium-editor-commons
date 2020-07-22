/* eslint @typescript-eslint/camelcase: off */
import { environment } from '../src';

import * as titaniumlib from 'titaniumlib';

import { expect } from 'chai';
import child_process from 'child_process';
import { EventEmitter } from 'events';
import mockFS from 'mock-fs';
import nock from 'nock';
import os from 'os';
import * as path from 'path';
import stream from 'stream';
import * as sinon from 'sinon';

function createChildMock (): child_process.ChildProcess {
	const fakeChild = new EventEmitter() as child_process.ChildProcess;
	fakeChild.stdout = new EventEmitter() as stream.Readable;
	fakeChild.stderr = new EventEmitter() as stream.Readable;
	return fakeChild;
}

describe('environment', () => {

	beforeEach(() => {
		mockFS.restore();
	});

	afterEach(() => {
		nock.cleanAll();
		mockFS.restore();
	});

	describe('validateEnvironment', () => {
		it('validateEnvironment with all installed components ', async () => {
			const sdkStub = global.sandbox.stub(titaniumlib.sdk, 'getInstalledSDKs');
			const installPath = path.join(os.homedir(), '.appcelerator', 'install');

			sdkStub.returns([
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

			const appcChild = createChildMock();
			global.sandbox.stub(child_process, 'spawn')
				.returns(appcChild);
			setTimeout(() => {
				appcChild.stdout?.emit('data', '{"NPM":"4.2.12","CLI":"4.2.0"}');
				appcChild.emit('close', 0);
			}, 500);

			const env = await environment.validateEnvironment();
			expect(env.missing).to.deep.equal([]);
			expect(env.installed).to.deep.equal(
				[
					{ name: 'Appcelerator CLI', version: '4.2.0' },
					{ name: 'Appcelerator CLI (npm)', version: '4.2.12' },
					{ name: 'Titanium SDK', version: '7.5.0.GA' }
				]
			);
		});
		it('validateEnvironment with no installed SDKS', async () => {
			const sdkStub = global.sandbox.stub(titaniumlib.sdk, 'getInstalledSDKs');
			const installPath = path.join(os.homedir(), '.appcelerator', 'install');

			sdkStub.returns([]);

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

			const appcChild = createChildMock();
			global.sandbox.stub(child_process, 'spawn')
				.returns(appcChild);
			setTimeout(() => {
				appcChild.stdout?.emit('data', '{"NPM":"4.2.12","CLI":"4.2.0"}');
				appcChild.emit('close', 0);
			}, 500);

			const env = await environment.validateEnvironment();
			expect(env.missing[0].name).to.deep.equal('Titanium SDK');
			expect(env.installed).to.deep.equal(
				[
					{ name: 'Appcelerator CLI', version: '4.2.0' },
					{ name: 'Appcelerator CLI (npm)', version: '4.2.12' }
				]
			);
		});
		it('validateEnvironment with no installed core', async () => {
			mockFS({});

			const appcChild = createChildMock();
			global.sandbox.stub(child_process, 'spawn')
				.withArgs('appc', sinon.match.any, sinon.match.any)
				.returns(appcChild);

			setTimeout(() => {
				appcChild.stdout?.emit('data', '{"NPM":"4.2.12"}');
				appcChild.emit('close', 0);
			}, 500);

			const env = await environment.validateEnvironment();
			expect(env.missing[0].name).to.deep.equal('Appcelerator CLI');
			expect(env.installed).to.deep.equal(
				[
					{ name: 'Appcelerator CLI (npm)', version: '4.2.12' }
				]
			);
		});
		it('validateEnvironment with no installed appc npm', async () => {
			const sdkStub = global.sandbox.stub(titaniumlib.sdk, 'getInstalledSDKs');
			const installPath = path.join(os.homedir(), '.appcelerator', 'install');

			sdkStub.returns([
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
				}
			]);

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

			const appcChild = createChildMock();
			const npmChild = createChildMock();

			const stub = global.sandbox.stub(child_process, 'spawn');

			stub
				.withArgs('appc', sinon.match.any, sinon.match.any)
				.returns(appcChild);

			stub
				.withArgs('npm', sinon.match.any, sinon.match.any)
				.returns(npmChild);

			setTimeout(() => {
				appcChild.stderr?.emit('data', '/bin/sh: appc: command not found');
				appcChild.emit('close', 127);
			}, 500);

			setTimeout(() => {
				npmChild.stdout?.emit('data', '{}');
				npmChild.emit('close', 0);
			}, 750);

			const env = await environment.validateEnvironment();
			expect(env.missing[0].name).to.deep.equal('Appcelerator CLI (npm)');
			expect(env.installed).to.deep.equal(
				[
					{ name: 'Appcelerator CLI', version: '4.2.0' },
					{ name: 'Titanium SDK', version: '7.5.0.GA' }
				]
			);
		});
	});
});
