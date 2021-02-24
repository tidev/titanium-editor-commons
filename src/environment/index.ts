import * as updates from '../updates';

interface Missing {
	name: string;
	getInstallInfo (): Promise<updates.UpdateInfo>;
}

interface Installed {
	name: string;
	version: string;
}

interface EnvironmentInfo {
	installed: Installed[];
	missing: Missing[];
}

export async function validateEnvironment(supportedVersions?: updates.SupportedVersions, useAppcTooling = true): Promise<EnvironmentInfo> {
	const environmentInfo: EnvironmentInfo = {
		installed: [],
		missing: []
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

	if (useAppcTooling) {
		const [ coreVersion, installVersion ] = await Promise.all([
			updates.appc.core.checkInstalledVersion(),
			updates.appc.install.checkInstalledVersion()
		]);

		if (coreVersion) {
			environmentInfo.installed.push({
				name: updates.ProductNames.AppcCore,
				version: coreVersion
			});
		} else {
			environmentInfo.missing.push({
				name: updates.ProductNames.AppcCore,
				getInstallInfo: () => {
					return updates.appc.core.checkForUpdate();
				}
			});
		}

		if (installVersion) {
			environmentInfo.installed.push({
				name: updates.ProductNames.AppcInstaller,
				version: installVersion
			});
		} else {
			environmentInfo.missing.push({
				name: updates.ProductNames.AppcInstaller,
				getInstallInfo: () => {
					return updates.appc.install.checkForUpdate();
				}
			});
		}
	} else {
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
	}

	const sdkVersion = await updates.titanium.sdk.checkInstalledVersion();

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

	return environmentInfo;
}
