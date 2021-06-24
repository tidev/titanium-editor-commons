import * as fs from 'fs-extra';

import { findAlloy, getAlloyCompletionsFileName, getSDKCompletionsFileName } from './util';

import * as generateV1 from './generate-v1';
import * as generateV2 from './generate-v2';
import * as generateV3 from './generate-v3';

export enum CompletionsFormat {
	v1 = 1,
	v2 = 2,
	v3 = 3
}

/**
 * Load completions list
 *
 * @param {String} sdkVersion - SDK Version to load completions for.
 * @param {CompletionsFormat} completionsVersion - Completions format to load
 * @returns {Object}
 */
export async function loadCompletions (sdkVersion: string, completionsVersion: CompletionsFormat = CompletionsFormat.v1): Promise<CompletionsData> {
	const { alloyVersion } = await findAlloy();
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
}

/**
 * Generate the Alloy completions file,
 * @param {Boolean} [force=false] - Generate the completions file even if it exists.
 * @param {CompletionsFormat} [completionsVersion=CompletionsFormat.v1] - Completions format to generate.
 * @returns {String|undefined}
 */
export async function generateAlloyCompletions (force = false, completionsVersion: CompletionsFormat = CompletionsFormat.v1): Promise<string|undefined> {
	if (completionsVersion === CompletionsFormat.v1) {
		return generateV1.generateAlloyCompletions(force);
	} else if (completionsVersion === CompletionsFormat.v2) {
		return generateV2.generateAlloyCompletions(force);
	} else if (completionsVersion === CompletionsFormat.v3) {
		return generateV3.generateAlloyCompletions(force);
	} else {
		throw new Error(`Unsupported format version specified ${completionsVersion}`);
	}
}

/**
 * Generate the SDK completions file,
 * @param {Boolean} [force=false] - Generate the completions file even if it exists.
 * @param {String} sdkVersion - SDK Version to generate completions for.
 * @param {String} sdkPath - Path to the SDK.
 * @param {CompletionsFormat} [completionsVersion=CompletionsFormat.v1] - Completions format to generate.
 * @returns {String|undefined}
 */
export async function generateSDKCompletions (force = false, sdkVersion: string, sdkPath: string, completionsVersion: CompletionsFormat = CompletionsFormat.v1): Promise<string|undefined> {
	if (completionsVersion === CompletionsFormat.v1) {
		return generateV1.generateSDKCompletions(force, sdkVersion, sdkPath);
	} else if (completionsVersion === CompletionsFormat.v2) {
		return generateV2.generateSDKCompletions(force, sdkVersion, sdkPath);
	} else if (completionsVersion === CompletionsFormat.v3) {
		return generateV3.generateSDKCompletions(force, sdkVersion, sdkPath);
	} else {
		throw new Error(`Unsupported format version specified ${completionsVersion}`);
	}
}

export interface CompletionsData {
	alloy: AlloyCompletions;
	titanium: TitaniumCompletions;
}

export interface TagDictionary {
	[key: string]: Tag;
}
export interface Tag {
	apiName: string;
}

export interface PropertiesDictionary {
	[key: string]: Property;
}
export interface Property {
	description: string;
	type: string;
	values: string[];
	readOnly?:boolean;
}
export interface TypeDictionary {
	[key: string]: Type;
}
export interface Type {
	description: string;
	events: string[];
	functions: string[];
	properties: string[];
}

interface AlloyCompletions {
	version: CompletionsFormat;
	alloyVersion: string;
	tags: TagDictionary;
	types: TypeDictionary;
}

interface TitaniumCompletions {
	version: CompletionsFormat;
	sdkVersion: string;
	properties: PropertiesDictionary;
	types: TypeDictionary;
}

interface JSCAAlias {
	descripton: string;
	name: string;
	type: string;
}

interface JSCAExample {
	title: string;
	code: string;
}

interface JSCAEvent {
	name: string;
	deprecated: boolean;
	description: string;
	properties: JSCAProperty[];
}

interface JSCAProperty {
	name: string;
	availability: string;
	constants: string[];
	examples: JSCAExample[];
	isClassProperty: boolean;
	isInstanceProperty: boolean;
	isInternal: boolean;
	since: JSCASince[];
	type: string;
	userAgents: JSCAUserAgent[];
	permission: string;
	description: string;
	deprecated: boolean;
}

interface JSCAReturn {
	type: string;
	description: string;
	constants: string;
}

interface JSCASince {
	name: string;
	version: string;
}

interface JSCAUserAgent {
	platform: string;
}

interface JSCAFunction {
	name: string;
	deprecated: boolean;
	description: string;
	events: JSCAEvent[];
	examples: JSCAExample[];
	exceptions: string[];
	isClassProperty: boolean;
	isConstructor: boolean;
	isInstanceProperty: boolean;
	isInternal: boolean;
	isMethod: boolean;
	parameters: JSCAParameter[];
	references: string;
	returnTypes: JSCAReturn[];
	since: JSCASince[];
	userAgents: JSCAUserAgent[];
}

interface JSCAParameter {
	name: string;
	constants: string[];
	description: string;
	type: string;
	deprecated: boolean;
	usage: 'required' | 'optional' | 'one-or-more';
}

interface JSCAType {
	name: string;
	description: string;
	deprecated: boolean;
	events: JSCAEvent[];
	examples: string[];
	functions: JSCAFunction[];
	inherits: string;
	isInternal: boolean;
	properties: JSCAProperty[];
	remarks: string[];
	since: JSCASince[];
	userAgents: JSCAUserAgent[];
}
export interface JSCA {
	types: JSCAType[];
	aliases: JSCAAlias[];
}

export {
	getSDKCompletionsFileName,
	getAlloyCompletionsFileName
};
