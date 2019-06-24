import * as updates from '../updates';
import { UpdateInfo } from '../updates';

interface Missing {
	name: string;
	getInstallInfo (): Promise<UpdateInfo>;
}

interface Installed {
	name: string;
	version: string;
}

interface EnvironmentInfo {
	installed: Installed[];
	missing: Missing[];
}

export async function validateEnvironment () {
	const environmentInfo: EnvironmentInfo = {
		installed: [],
		missing: []
	};
	const [coreVersion, installVersion, sdkVersion] = await Promise.all([
		await updates.appc.core.checkInstalledVersion(),
		await updates.appc.install.checkInstalledVersion(),
		await updates.titanium.sdk.checkInstalledVersion()
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
