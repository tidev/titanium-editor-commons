import * as alloy from './alloy';
import * as appc from './appc';
import { ProductNames } from './product-names';
import * as node from './node';
import * as titanium from './titanium';

interface UpdateInfo {
	currentVersion: string|undefined;
	hasUpdate: boolean;
	latestVersion: string;
	productName: string;
	releaseNotes: string;
	priority: number;
	action (version: string): void;
}

export interface SupportedVersions {
	nodeJS?: string;
}

async function checkAllUpdates(supportedVersions?: SupportedVersions, useAppcTooling = true): Promise<UpdateInfo[]> {
	// Setup the always required checks and then add the ones dependent on the tooling we use
	const updateChecks = [
		node.checkForUpdate(supportedVersions?.nodeJS),
		titanium.sdk.checkForUpdate()
	];

	if (useAppcTooling) {
		updateChecks.push(appc.core.checkForUpdate(), appc.install.checkForUpdate());
	} else {
		updateChecks.push(alloy.checkForUpdate(), titanium.cli.checkForUpdate());
	}

	const updates = await Promise.all(updateChecks);

	// Remove anything that doesn't require an update and then sort the array by running priority
	return updates.filter(update => update && update.hasUpdate).sort((curr: UpdateInfo, prev: UpdateInfo) => curr.priority - prev.priority);
}

export {
	UpdateInfo,
	checkAllUpdates,
	alloy,
	appc,
	node,
	titanium,
	ProductNames
};
