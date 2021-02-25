import { environment } from '../src';
import { expect } from 'chai';
import child_process from 'child_process';
import mockFS from 'mock-fs';
import nock from 'nock';
import { mockAppcCli, mockNode, mockNpmCli, mockSdk } from './util';

describe('environment', () => {

	beforeEach(() => {
		mockFS.restore();
	});

	afterEach(() => {
		nock.cleanAll();
		mockFS.restore();
	});

	describe('validateEnvironment', () => {
		it('validateEnvironment with all installed component ', async () => {
			const stub = global.sandbox.stub(child_process, 'spawn');
			mockNode(stub, '12.18.2');
			mockSdk('7.5.0');
			mockAppcCli(stub, '4.2.0', '4.2.12', 750, true);

			const env = await environment.validateEnvironment();
			expect(env.missing).to.deep.equal([]);
			expect(env.installed).to.deep.equal(
				[
					{ name: 'Node.js', version: '12.18.2' },
					{ name: 'Appcelerator CLI', version: '4.2.0' },
					{ name: 'Appcelerator CLI (npm)', version: '4.2.12' },
					{ name: 'Titanium SDK', version: '7.5.0.GA' }
				]
			);
		});

		it('validateEnvironment with no installed SDKS', async () => {
			const stub = global.sandbox.stub(child_process, 'spawn');
			mockNode(stub, '12.18.1');
			mockAppcCli(stub, '4.2.0', '4.2.12', 750, true);
			mockSdk(undefined);

			const env = await environment.validateEnvironment();
			expect(env.missing[0].name).to.deep.equal('Titanium SDK');
			expect(env.installed).to.deep.equal(
				[
					{ name: 'Node.js', version: '12.18.1' },
					{ name: 'Appcelerator CLI', version: '4.2.0' },
					{ name: 'Appcelerator CLI (npm)', version: '4.2.12' }
				]
			);
		});

		it('validateEnvironment with no installed core', async () => {
			const stub = global.sandbox.stub(child_process, 'spawn');
			mockNode(stub, '12.18.1');
			mockAppcCli(stub, undefined, '4.2.12', 750);
			mockSdk('7.5.0');
			const env = await environment.validateEnvironment();
			expect(env.missing[0].name).to.deep.equal('Appcelerator CLI');
			expect(env.installed).to.deep.equal(
				[
					{ name: 'Node.js', version: '12.18.1' },
					{ name: 'Appcelerator CLI (npm)', version: '4.2.12' },
					{ name: 'Titanium SDK', version: '7.5.0.GA' }
				]
			);
		});

		it('validateEnvironment with no installed appc npm', async () => {
			const stub = global.sandbox.stub(child_process, 'spawn');

			mockSdk('7.5.0');
			mockNode(stub, '12.18.1');
			mockAppcCli(stub, '4.2.0', undefined, 750, true);

			const env = await environment.validateEnvironment();
			expect(env.missing[0].name).to.deep.equal('Appcelerator CLI (npm)');
			expect(env.installed).to.deep.equal(
				[
					{ name: 'Node.js', version: '12.18.1' },
					{ name: 'Appcelerator CLI', version: '4.2.0' },
					{ name: 'Titanium SDK', version: '7.5.0.GA' }
				]
			);
		});

		it('validateEnvironment with no Node.js', async () => {
			const stub = global.sandbox.stub(child_process, 'spawn');

			mockNode(stub, undefined);

			const env = await environment.validateEnvironment();
			expect(env.missing.length).to.deep.equal(1);
			expect(env.missing[0].name).to.deep.equal('Node.js');
			expect(env.installed.length).to.equal(0);
		});

		it('should detect Titanium and Alloy CLI when useAppcTooling is false', async () => {
			const stub = global.sandbox.stub(child_process, 'spawn');
			mockSdk('7.5.0');
			mockNode(stub, '12.18.1');
			mockNpmCli(stub, 'alloy', '1.15.2', 750);
			mockNpmCli(stub, 'titanium', '5.3.0', 1000);

			const env = await environment.validateEnvironment(undefined, false);
			expect(env.missing.length).to.equal(0);
			expect(env.installed).to.deep.equal(
				[
					{ name: 'Node.js', version: '12.18.1' },
					{ name: 'Alloy', version: '1.15.2' },
					{ name: 'Titanium CLI', version: '5.3.0' },
					{ name: 'Titanium SDK', version: '7.5.0.GA' }
				]
			);
		});

		it('should detect Titanium and Alloy CLI when useAppcTooling is false, not installed', async () => {
			const stub = global.sandbox.stub(child_process, 'spawn');
			mockSdk('7.5.0');
			mockNode(stub, '12.18.1');
			mockNpmCli(stub, 'alloy', undefined, 750);
			mockNpmCli(stub, 'titanium', undefined, 1000);

			const env = await environment.validateEnvironment(undefined, false);
			expect(env.missing.length).to.equal(2);
			expect(env.missing[0].name).to.equal('Alloy');
			expect(env.missing[1].name).to.equal('Titanium CLI');
			expect(env.installed).to.deep.equal(
				[
					{ name: 'Node.js', version: '12.18.1' },
					{ name: 'Titanium SDK', version: '7.5.0.GA' }
				]
			);
		});
	});
});
