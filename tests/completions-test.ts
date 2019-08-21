import { generateAlloyCompletions, generateSDKCompletions, loadCompletions } from '../src/completions';
import { CustomError } from '../src/completions/util';

import * as updates from '../updates/';

import { expect } from 'chai';
import fs from 'fs-extra';
import mockFS from 'mock-fs';
import os from 'os';
import * as path from 'path';

import { parsers } from './fixtures/parsers';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

describe.only('updates', () => {

	beforeEach(() => {
		mockFS.restore();
	});

	afterEach(() => {
		mockFS.restore();
	});

	describe('completions.generateAlloyCompletions', () => {
		it('Generate Alloy Completions', async () => {
			const appcPath = path.join(os.homedir(), '.appcelerator', 'install');
			const alloyPath = path.join(appcPath, '4.2.0', 'package', 'node_modules', 'alloy');
			const alloyTagsPath = path.join(alloyPath, 'Alloy', 'commands', 'compile', 'parsers');

			mockFS({
				[appcPath]: {
					'.version': '4.2.0'
				},
				[alloyPath]: {
					'package.json': '{"version": "0.2.0"}'
				},
				[alloyTagsPath]: mockFS.directory({
					items: parsers
				})

			});

			const completions = await generateAlloyCompletions(true);
			expect(completions).to.equal('0.2.0');

		});
		it('Generate Alloy Completions without alloy installed', async () => {
			try {
				await generateAlloyCompletions(true);
			} catch (error) {
				expect(error).to.be.instanceOf(Error);
				expect(error.message).to.equal('Unable to find installed alloy version.');
			}
		});
		it('Generate Alloy Completions with pre-existing completions', async () => {
			const appcPath = path.join(os.homedir(), '.appcelerator', 'install');
			const alloyPath = path.join(appcPath, '4.2.0', 'package', 'node_modules', 'alloy');
			const alloyTagsPath = path.join(alloyPath, 'Alloy', 'commands', 'compile', 'parsers');
			const completionsPath = path.join(os.homedir(), '.titanium', 'completions', 'alloy', '0.2.0');

			mockFS({
				[appcPath]: {
					'.version': '4.2.0'
				},
				[alloyPath]: {
					'package.json': '{"version": "0.2.0"}'
				},
				[alloyTagsPath]: mockFS.directory({
					items: parsers
				}),
				[completionsPath]: {
					'completions-v1.json': ''
				},
			});

			const completions = await generateAlloyCompletions(false);
			expect(completions).to.equal(undefined);
		});
	});

	describe('completions.generateSDKCompletions', () => {
		it('Generate SDK Completions', async () => {
			const completions = await generateSDKCompletions(true, '8.1.0.GA', FIXTURES_DIR, 1);
			expect(completions).to.equal('8.1.0.GA');
		});

		it('Generate SDK Completions without sdk', async () => {
			try {
				await generateSDKCompletions(true, '8.1.0.GA', '', 1);
			} catch (error) {
				expect(error).to.be.instanceOf(CustomError);
				expect(error.message).to.equal('The current projects SDK version 8.1.0.GA, is not installed. Please update the SDK version in the tiapp to generate autocomplete suggestions.');
				expect(error.code).to.equal('ESDKNOTINSTALLED');
			}
		});
		it('Generate SDK Completions with pre-existing completions', async () => {
			const completionsPath = path.join(os.homedir(), '.titanium', 'completions', 'titanium', '8.1.0.GA');

			mockFS({
				[completionsPath]: {
					'completions-v1.json': ''
				},
			});
			const completions = await generateSDKCompletions(false, '8.1.0.GA', FIXTURES_DIR, 1);
			expect(completions).to.equal(undefined);
		});
	});
	describe.only('completions.generateSDKCompletions', () => {
		it('Generate SDK Completions', async () => {
			const appcPath = path.join(os.homedir(), '.appcelerator', 'install');
			const alloyPath = path.join(appcPath, '4.2.0', 'package', 'node_modules', 'alloy');
			const alloyTagsPath = path.join(alloyPath, 'Alloy', 'commands', 'compile', 'parsers');

			mockFS({
				[appcPath]: {
					'.version': '4.2.0'
				},
				[alloyPath]: {
					'package.json': '{"version": "0.2.0"}'
				},
				[alloyTagsPath]: mockFS.directory({
					items: parsers
				}),
				[FIXTURES_DIR]: {
					'api.jsca': await fs.readFile(path.join(FIXTURES_DIR , 'api.jsca'))
				}
			});

			const sdkCompletions = await generateSDKCompletions(true, '8.1.0.GA', FIXTURES_DIR, 1);
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
});
