import * as alloy from './alloy';
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

async function checkAllUpdates(supportedVersions?: SupportedVersions): Promise<UpdateInfo[]> {
	const updates = await Promise.all([
		alloy.checkForUpdate(),
		node.checkForUpdate(supportedVersions?.nodeJS),
		titanium.cli.checkForUpdate(),
		titanium.sdk.checkForUpdate()
	]);

	// Remove anything that doesn't require an update and then sort the array by running priority
	return updates.filter(update => update && update.hasUpdate).sort((curr: UpdateInfo, prev: UpdateInfo) => curr.priority - prev.priority);
}

export {
	UpdateInfo,
	checkAllUpdates,
	alloy,
	node,
	titanium,
	ProductNames
};
