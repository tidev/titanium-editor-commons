import * as updates from '../updates';
import { Action, CustomError } from '../util';

interface Missing {
	name: string;
	getInstallInfo (): Promise<updates.UpdateInfo>;
}

interface Installed {
	name: string;
	version: string;
}

interface Issue {
	title: string;
	actions: Action[]
}

interface EnvironmentInfo {
	installed: Installed[];
	missing: Missing[];
	issues: Issue[];
}

export async function validateEnvironment(supportedVersions?: updates.SupportedVersions): Promise<EnvironmentInfo> {
	const environmentInfo: EnvironmentInfo = {
		installed: [],
		issues: [],
		missing: [],
	};

	const nodeVersion = await updates.node.checkInstalledVersion();

	if (nodeVersion) {
		environmentInfo.installed.push({
			name: updates.ProductNames.Node,
			version: nodeVersion
		});
	} else {
		environmentInfo.missing.push({
			name: updates.ProductNames.Node,
			getInstallInfo: () => {
				return updates.node.checkForUpdate(supportedVersions?.nodeJS);
			}
		});
		return environmentInfo;
	}

	const [ alloyVersion, cliVersion ] = await Promise.all([
		updates.alloy.checkInstalledVersion(),
		updates.titanium.cli.checkInstalledVersion(),
	]);

	if (alloyVersion) {
		environmentInfo.installed.push({
			name: updates.ProductNames.Alloy,
			version: alloyVersion
		});
	} else {
		environmentInfo.missing.push({
			name: updates.ProductNames.Alloy,
			getInstallInfo: () => {
				return updates.alloy.checkForUpdate();
			}
		});
	}

	if (cliVersion) {
		environmentInfo.installed.push({
			name: updates.ProductNames.TitaniumCLI,
			version: cliVersion
		});
	} else {
		environmentInfo.missing.push({
			name: updates.ProductNames.TitaniumCLI,
			getInstallInfo: () => {
				return updates.titanium.cli.checkForUpdate();
			}
		});
	}

	try {
		const sdkVersion = await updates.titanium.sdk.checkInstalledVersion(true);
		if (sdkVersion) {
			environmentInfo.installed.push({
				name: updates.ProductNames.TitaniumSDK,
				version: sdkVersion.name
			});
		} else {
			environmentInfo.missing.push({
				name: updates.ProductNames.TitaniumSDK,
				getInstallInfo: () => {
					return updates.titanium.sdk.checkForUpdate();
				}
			});
		}
	} catch (error) {
		if (error instanceof CustomError && error.code === 'ESELECTEDSDKNOTINSTALLED') {
			environmentInfo.issues.push({
				title: error.message,
				actions: error.actions || []
			});
		}
	}

	return environmentInfo;
}
