import * as fs from 'fs-extra';

import { getAlloyCompletionsFileName, getAlloyVersion, getSDKCompletionsFileName } from './util';

import * as generateV1 from './generate-v1';

/**
 * Load completions list
 *
 * @returns {Object}
 */
export async function loadCompletions (sdkVersion: string, completionsVersion: CompletionsFormat = CompletionsFormat.v1) {
	try {
		const alloyVersion = await getAlloyVersion();
		const sdkCompletions = await fs.readJSON(getSDKCompletionsFileName(sdkVersion, completionsVersion));
		const alloyCompletions = await fs.readJSON(getAlloyCompletionsFileName(alloyVersion, completionsVersion));
		Object.assign(sdkCompletions.properties, {
			id: {
				description: 'TSS id'
			},
			class: {
				description: 'TSS class'
			},
			platform: {
				type: 'String',
				description: 'Platform condition',
				values: [
					'android',
					'ios',
					'mobileweb',
					'windows'
				]
			}
		});
		return {
			alloy: alloyCompletions,
			titanium: sdkCompletions
		};
	} catch (error) {
		throw error;
	}
}
export async function generateAlloyCompletions (force: boolean = false, completionsVersion: CompletionsFormat = CompletionsFormat.v1) {
	if (completionsVersion === CompletionsFormat.v1) {
		return generateV1.generateAlloyCompletions(force);
	} else {
		throw new Error(`Unsupported format version specified ${completionsVersion}`);
	}
}

export async function generateSDKCompletions (force: boolean = false, sdkVersion: string, sdkPath: string, completionsVersion: CompletionsFormat = CompletionsFormat.v1) {
	if (completionsVersion === CompletionsFormat.v1) {
		return generateV1.generateSDKCompletions(force, sdkVersion, sdkPath);
	} else {
		throw new Error(`Unsupported format version specified ${completionsVersion}`);
	}
}

export enum CompletionsFormat {
	v1 = 1
}

export {
	getSDKCompletionsFileName,
	getAlloyCompletionsFileName
};
