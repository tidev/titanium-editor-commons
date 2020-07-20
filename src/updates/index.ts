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

async function checkAllUpdates (): Promise<UpdateInfo[]> {
	const updates = await Promise.all([
		appc.core.checkForUpdate(),
		appc.install.checkForUpdate(),
		titanium.sdk.checkForUpdate()
	]);

	return updates.filter(update => update && update.hasUpdate);
}

export {
	UpdateInfo,
	checkAllUpdates,
	appc,
	node,
	titanium,
	ProductNames
};
