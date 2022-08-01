import { environment } from '../src';
import * as util from '../src/util';

import { expect } from 'chai';
import mockFS from 'mock-fs';
import nock from 'nock';
import { mockNode, mockNpmCli, mockSdkList } from './util';
import sinon from 'sinon';

describe('environment', () => {
	let sandbox: sinon.SinonSandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		mockFS.restore();
	});

	afterEach(() => {
		nock.cleanAll();
		mockFS.restore();
		sandbox.restore();
	});

	describe('validateEnvironment', () => {
		it('validateEnvironment with all installed component ', async () => {
			const stub = sandbox.stub(util, 'exec');
			mockNode(stub, '12.18.2');
			mockSdkList(stub, '7.5.0');
			mockNpmCli(stub, 'titanium', '5.3.0');
			mockNpmCli(stub, 'alloy', '1.15.3');

			const env = await environment.validateEnvironment();
			expect(env.missing).to.deep.equal([]);
			expect(env.installed).to.deep.equal(
				[
					{ name: 'Node.js', version: '12.18.2' },
					{ name: 'Alloy', version: '1.15.3' },
					{ name: 'Titanium CLI', version: '5.3.0' },
					{ name: 'Titanium SDK', version: '7.5.0.GA' }
				]
			);
		});

		it('validateEnvironment with no installed SDKS', async () => {
			const stub = sandbox.stub(util, 'exec');
			mockNode(stub, '12.18.1');
			mockNpmCli(stub, 'titanium', '5.3.0');
			mockNpmCli(stub, 'alloy', '1.15.3');
			mockSdkList(stub, undefined);

			const env = await environment.validateEnvironment();
			expect(env.missing[0].name).to.deep.equal('Titanium SDK');
			expect(env.installed).to.deep.equal(
				[
					{ name: 'Node.js', version: '12.18.1' },
					{ name: 'Alloy', version: '1.15.3' },
					{ name: 'Titanium CLI', version: '5.3.0' },
				]
			);
		});

		it('validateEnvironment with no Node.js', async () => {
			const stub = sandbox.stub(util, 'exec');

			mockNode(stub, undefined);

			const env = await environment.validateEnvironment();
			expect(env.missing.length).to.deep.equal(1);
			expect(env.missing[0].name).to.deep.equal('Node.js');
			expect(env.installed.length).to.equal(0);
		});

		it('should detect Titanium and Alloy CLI when not installed', async () => {
			const stub = sandbox.stub(util, 'exec');
			mockNode(stub, '12.18.1');
			mockNpmCli(stub, 'alloy', undefined);
			mockNpmCli(stub, 'titanium', undefined);

			const env = await environment.validateEnvironment(undefined);
			expect(env.missing.length).to.equal(3);
			expect(env.missing[0].name).to.equal('Alloy');
			expect(env.missing[1].name).to.equal('Titanium CLI');
			expect(env.missing[2].name).to.equal('Titanium SDK'); // SDK is coupled to CLI detection
			expect(env.installed).to.deep.equal(
				[
					{ name: 'Node.js', version: '12.18.1' }
				]
			);
		});

		it('validateEnvironment with installed SDKs', async () => {
			const stub = sandbox.stub(util, 'exec');
			mockNode(stub, '12.18.1');
			mockNpmCli(stub, 'titanium', '5.3.0');
			mockNpmCli(stub, 'alloy', '1.15.3');
			mockSdkList(stub, '8.0.0', '7.0.0');

			expect(environment.validateEnvironment()).to.eventually.throw(util.CustomError, 'Selected SDK 7.0.0.GA is not installed');
		});
	});
});
