import * as fs from 'fs-extra';
import * as path from 'path';

import { CompletionsFormat, PropertiesDictionary, TagDictionary, TypeDictionary  } from './index';
import { findAlloy, getAlloyCompletionsFileName, getSDKCompletionsFileName } from './util';
import { CustomError } from '../util';

/**
 * Generate completions for an Alloy version.
 *
 * @param {Boolean} force - Force generation of completion file.
 */
export async function generateAlloyCompletions (force: boolean): Promise<string|undefined> {
	const { alloyPath, alloyVersion } = await findAlloy();

	const alloyCompletionsFilename = getAlloyCompletionsFileName(alloyVersion, CompletionsFormat.v1);

	if (!force && await fs.pathExists(alloyCompletionsFilename)) {
		return;
	}

	// TODO: Generate completions from this?
	// const alloyApi = await fs.readJSON(path.join(alloyPath, 'docs', 'api.jsca'));

	// generate tag list
	const alloyTags = await fs.readdir(path.join(alloyPath, 'Alloy', 'commands', 'compile', 'parsers'));
	const tagDic: TagDictionary = {};
	for (const tag of alloyTags) {
		if (!tag.endsWith('.js')) {
			continue;
		}
		const ar = tag.split('.');
		const tagName = ar[ar.length - 2];
		if (tagName.indexOf('_') !== 0 && tagName[0] === tagName[0].toUpperCase()) {
			tagDic[tagName] = {
				apiName: tag.replace('.js', '')
			};
		} else if (tagName === '_ProxyProperty' && tag.indexOf('Ti.UI') === 0) {
			tagDic[ar[ar.length - 3]] = { // Ti.UI.Window._ProxyProperty
				apiName: tag.replace('.js', '').replace('._ProxyProperty', '')
			};
		}
	}

	// add missing tags
	Object.assign(tagDic, {
		View: {
			apiName: 'Ti.UI.View'
		},
		Templates: {},
		HeaderView: {},
		FooterView: {},
		ScrollView: {
			apiName: 'Ti.UI.ScrollView'
		},
		Slider: {
			apiName: 'Ti.UI.Slider'
		},
		TableViewRow: {
			apiName: 'Ti.UI.TableViewRow'
		},
		Alloy: {},
		ActivityIndicator: {
			apiName: 'Ti.UI.ActivityIndicator'
		},
		WebView: {
			apiName: 'Ti.UI.WebView'
		}
	});

	const sortedTagDic: TagDictionary = {};
	Object.keys(tagDic)
		.sort()
		.forEach(k => sortedTagDic[k] = tagDic[k]);

	await fs.ensureDir(path.dirname(alloyCompletionsFilename));
	await fs.writeJSON(alloyCompletionsFilename, {
		version: 1,
		alloyVersion,
		tags: sortedTagDic
	},
	{
		spaces: '\t'
	});
	return alloyVersion;
}

/**
 *
 * Generate completions file for a Titanium SDK.
 *
 * @param {Boolean} force=false - Force generation of the completion file.
 * @param {String} sdkVersion - SDK Version to generate completions for.
 * @param {String} sdkPath - SDK Path to generate completions for.
 */
export async function generateSDKCompletions (force: boolean, sdkVersion: string, sdkPath: string): Promise<string|undefined> {
	// Make sdkVersion optional and load for selected SDK?
	const sdkCompletionsFilename = getSDKCompletionsFileName(sdkVersion, CompletionsFormat.v1);

	if (!force && await fs.pathExists(sdkCompletionsFilename)) {
		return;
	}

	if (!sdkPath) {
		throw new CustomError(`The current projects SDK version ${sdkVersion}, is not installed. Please update the SDK version in the tiapp to generate autocomplete suggestions.`, 'ESDKNOTINSTALLED');
	}

	const titaniumAPIPath = path.join(sdkPath, 'api.jsca');
	const api = await fs.readJSON(titaniumAPIPath);
	// property list
	const types: TypeDictionary = {};
	const props: PropertiesDictionary = {};

	for (const type of api.types) {
		if (type.deprecated) {
			continue;
		}

		const propertyNamesOfType = [];
		for (const prop of type.properties) {
			if (prop.permission !== 'read-only' && prop.name.indexOf('Modules.') !== 0) {

				propertyNamesOfType.push(prop.name);

				// property name
				if (props[prop.name]) { // if duplicated property name - merge available values
					Object.assign(props[prop.name], {
						description: props[prop.name].description === prop.description.replace(/<p>|<\/p>/g, '') ? props[prop.name].description : ''
					});
					if (prop.constants.length) {
						const values: string[] = props[prop.name].values ? props[prop.name].values.concat(prop.constants) : prop.constants;
						props[prop.name].values = [ ...new Set(values) ];
					}
				} else {
					props[prop.name] = {
						description: prop.description.replace(/<p>|<\/p>/g, ''),
						type: prop.type,
						values: []
					};
					if (prop.constants.length) {
						props[prop.name].values = prop.constants;
					}
				}
			}
		}

		types[type.name.replace(/Titanium\./g, 'Ti.')] = {
			description: type.description.replace(/<p>|<\/p>/g, ''),
			functions: type.functions.map((f: { deprecated: boolean; name: string }) => {
				return (f.deprecated) ? f.name + '|deprecated' : f.name;
			}),
			properties: propertyNamesOfType,
			events: type.events.map((e: { deprecated: boolean; name: string }) => {
				return (e.deprecated) ? e.name + '|deprecated' : e.name;
			})
		};
	}

	// Alias
	for (const [ key, prop ] of Object.entries(props)) {
		if (prop.type === 'Boolean') {
			prop.values = [ 'true', 'false' ];
		} else if (prop.values) {
			// alias Titanium -> Ti
			prop.values = prop.values.map((val: string) => {
				const splitedName = val.split('.');
				const typeName = splitedName.slice(0, -1).join('.');
				const tiUIProps = api.types.find((type: { name: string }) => type.name === typeName).properties;
				const curPropInfo = tiUIProps.find((property: { name: string }) => property.name === splitedName[splitedName.length - 1]);

				let shortName: string = val.replace(/Titanium\./g, 'Ti.');
				if (curPropInfo.deprecated) {
					shortName += '|deprecated';
				}
				return shortName;
			});
		}

		if (/[Cc]olor$/.test(key)) {
			prop.values = [
				'\'transparent\'', '\'aqua\'', '\'black\'', '\'blue\'', '\'brown\'', '\'cyan\'', '\'darkgray\'', '\'fuchsia\'', '\'gray\'', '\'green\'',
				'\'lightgray\'', '\'lime\'', '\'magenta\'', '\'maroon\'', '\'navy\'', '\'olive\'', '\'orange\'', '\'pink\'', '\'purple\'', '\'red\'', '\'silver\'', '\'teal\'', '\'white\'', '\'yellow\''
			];
		}
	}
	// missing types
	Object.assign(types, {
		'Alloy.Abstract.ItemTemplate': {
			description: 'Template that represents the basic appearance of a list item.',
			functions: [
			],
			properties: [
				'name',
				'height'
			],
			events: []
		},
		'Alloy.Widget': {
			description: 'Widgets are self-contained components that can be easily dropped into an Alloy project.',
			functions: [],
			properties: [
				'src'
			],
			events: []
		},
		'Alloy.Require': {
			description: 'Require alloy controller',
			functions: [],
			properties: [
				'src'
			],
			events: []
		}
	});

	// missing values
	props.layout.values = [ '\'vertical\'', '\'horizontal\'', '\'composite\'' ];

	const sortedProps: PropertiesDictionary = {};
	Object.keys(props)
		.sort()
		.forEach(k => sortedProps[k] = props[k]);

	await fs.ensureDir(path.dirname(sdkCompletionsFilename));
	await fs.writeJSON(sdkCompletionsFilename,
		{
			version: 1,
			sdkVersion,
			properties: sortedProps,
			types
		},
		{
			spaces: '\t'
		});
	return sdkVersion;
}
