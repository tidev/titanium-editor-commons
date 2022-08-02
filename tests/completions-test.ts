import * as util from '../src/util';
import { CompletionsFormat, generateAlloyCompletions, generateSDKCompletions, loadCompletions } from '../src/completions';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import fs from 'fs-extra';
import mockFS from 'mock-fs';
import os from 'os';
import * as path from 'path';
import sinon from 'sinon';

import { parsers } from './fixtures/parsers';
import execa from 'execa';

chai.use(chaiAsPromised);
const expect = chai.expect;
const FIXTURES_DIR = path.join(__dirname, 'fixtures');
let sandbox: sinon.SinonSandbox;

async function mockNpmAlloy (noInstall = false) {
	const installPath = path.join(os.homedir(), 'node_modules');
	const stub = sandbox.stub(util, 'exec');

	stub
		.withArgs('npm', sinon.match.any, sinon.match.any)
		.resolves({ stdout: installPath } as execa.ExecaReturnValue);

	if (noInstall) {
		return {
			[installPath]: {}
		};
	} else {
		return {
			[installPath]: {
				alloy: {
					'package.json': '{"version": "0.2.0"}',
					Alloy: {
						commands: {
							compile: {
								parsers: mockFS.directory({
									items: parsers
								}),
							}
						}
					},
					docs: {
						'api.jsca': await fs.readFile(path.join(FIXTURES_DIR, 'alloy-api.jsca'))
					}
				}
			}
		};
	}
}

function mockCompletions () {
	const completionsPath = path.join(os.homedir(), '.titanium', 'completions', 'alloy', '0.2.0');
	return {
		[completionsPath]: {
			'completions-v1.json': ''
		}
	};
}

describe('completions', () => {

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		mockFS.restore();
	});

	afterEach(() => {
		mockFS.restore();
		sandbox.restore();
	});

	describe('completions.generateAlloyCompletions', () => {
		it('Generate AlloyCompletions from npm', async () => {
			mockFS({ ...await mockNpmAlloy() });
			const completions = await generateAlloyCompletions(true);
			expect(completions).to.equal('0.2.0');
		});

		it('Generate Alloy Completions without alloy installed', async () => {
			mockFS({ ...await mockNpmAlloy(true) });
			await expect(generateAlloyCompletions(true)).to.be.rejectedWith(Error, 'Unable to find Alloy');
		});

		it('Generate Alloy Completions with pre-existing completions', async () => {
			mockFS({ ...await mockNpmAlloy(), ...mockCompletions() });
			const completions = await generateAlloyCompletions(false);
			expect(completions).to.equal(undefined);
		});
	});

	describe('completions.generateSDKCompletions', () => {
		it('Generate SDK Completions', async () => {
			mockFS({
				[FIXTURES_DIR]: {
					'api.jsca': await fs.readFile(path.join(FIXTURES_DIR, 'ti-api.jsca'))
				},
			});
			const completions = await generateSDKCompletions(true, '8.1.0.GA', FIXTURES_DIR, CompletionsFormat.v1);
			expect(completions).to.equal('8.1.0.GA');
		});

		it('Generate SDK Completions without sdk', async () => {
			try {
				await generateSDKCompletions(true, '8.1.0.GA', '', CompletionsFormat.v1);
			} catch (error) {
				expect(error).to.be.instanceOf(util.CustomError);
				expect((error as util.CustomError).message).to.equal('The current projects SDK version 8.1.0.GA, is not installed. Please update the SDK version in the tiapp to generate autocomplete suggestions.');
				expect((error as util.CustomError).code).to.equal('ESDKNOTINSTALLED');
			}
		});
		it('Generate SDK Completions with pre-existing completions', async () => {
			const completionsPath = path.join(os.homedir(), '.titanium', 'completions', 'titanium', '8.1.0.GA');

			mockFS({
				[completionsPath]: {
					'completions-v1.json': ''
				},
			});

			const completions = await generateSDKCompletions(false, '8.1.0.GA', FIXTURES_DIR, CompletionsFormat.v1);
			expect(completions).to.equal(undefined);
		});
	});

	describe('completions.loadCompletions', () => {
		it('Load Completions', async () => {

			mockFS({
				...await mockNpmAlloy(),
				[FIXTURES_DIR]: {
					'api.jsca': await fs.readFile(path.join(FIXTURES_DIR, 'ti-api.jsca'))
				},
			});

			const sdkCompletions = await generateSDKCompletions(true, '8.1.0.GA', FIXTURES_DIR, CompletionsFormat.v1);
			expect(sdkCompletions).to.equal('8.1.0.GA');

			const alloyCompletions = await generateAlloyCompletions(true);
			expect(alloyCompletions).to.equal('0.2.0');

			const completions = await loadCompletions('8.1.0.GA');
			expect(completions.alloy.alloyVersion).to.equal('0.2.0');
			expect(completions.alloy.version).to.equal(1);
			expect(completions.titanium.sdkVersion).to.equal('8.1.0.GA');
			expect(completions.titanium.version).to.equal(1);
		});
	});

	describe('completions.loadCompletions V2', () => {
		it('Load Completions', async () => {

			mockFS({
				...await mockNpmAlloy(),
				[FIXTURES_DIR]: {
					'api.jsca': await fs.readFile(path.join(FIXTURES_DIR, 'ti-api.jsca'))
				},
			});

			const sdkCompletions = await generateSDKCompletions(true, '8.1.0.GA', FIXTURES_DIR, CompletionsFormat.v2);
			expect(sdkCompletions).to.equal('8.1.0.GA');

			const alloyCompletions = await generateAlloyCompletions(true, CompletionsFormat.v2);
			expect(alloyCompletions).to.equal('0.2.0');

			const completions = await loadCompletions('8.1.0.GA', CompletionsFormat.v2);
			expect(completions.alloy.alloyVersion).to.equal('0.2.0');
			expect(completions.alloy.version).to.equal(2);
			expect(completions.titanium.sdkVersion).to.equal('8.1.0.GA');
			expect(completions.titanium.version).to.equal(2);
		});
	});

	describe('completions.loadCompletions V3', () => {
		it('Load Completions', async () => {

			mockFS({
				...await mockNpmAlloy(),
				[FIXTURES_DIR]: {
					'api.jsca': await fs.readFile(path.join(FIXTURES_DIR, 'ti-api.jsca'))
				},
			});

			const sdkCompletions = await generateSDKCompletions(true, '8.1.0.GA', FIXTURES_DIR, CompletionsFormat.v3);
			expect(sdkCompletions).to.equal('8.1.0.GA');

			const alloyCompletions = await generateAlloyCompletions(true, CompletionsFormat.v3);
			expect(alloyCompletions).to.equal('0.2.0');

			const completions = await loadCompletions('8.1.0.GA', CompletionsFormat.v3);
			expect(completions.alloy.alloyVersion).to.equal('0.2.0');
			expect(completions.alloy.version).to.equal(3);
			expect(completions.titanium.sdkVersion).to.equal('8.1.0.GA');
			expect(completions.titanium.version).to.equal(3);
		});
	});
});
