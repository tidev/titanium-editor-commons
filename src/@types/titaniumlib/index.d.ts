interface BranchData {
	defaultBranch: string;
	branches: string[];
}

interface BuildData {
	[key: string]: {
		date: Date;
		githash: string;
		ts: string;
		url: string;
		version: string;
	};
}

interface ReleaseInfo {
	[key: string]: {
		name: string;
		url: string;
		version: string;
	};
}

declare class TitaniumSDK {
	name: string;
	manifest: {
		githash: string;
		moduleAPIVersion: {
			[key: string]: string;
		};
		name: string;
		platforms: string[];
		timestamp: string;
		version: string;
	};
	path: string;
}

declare module 'titaniumlib' {
	namespace sdk {

		interface InstallParams {
			downloadDir?: string;
			installDir?: string;
			keep?: boolean;
			overwrite?: boolean;
			uri?: string;
		}

		function getBranches (): Promise<BranchData>;

		function getBuilds (branch?: string): Promise<BuildData>;

		function getInstalledSDKs (force?: boolean): TitaniumSDK[];

		function getPaths (): string[];

		function getReleases (noLatest?: boolean): Promise<ReleaseInfo>;

		function install (params?: InstallParams): Promise<string>;

		function uninstall (nameOrPath: string): Promise<TitaniumSDK[]>;
	}
}
