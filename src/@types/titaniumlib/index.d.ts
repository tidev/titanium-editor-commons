
declare module 'titaniumlib' {
	namespace sdk {

		interface InstallParams {
			downloadDir?: string;
			installDir?: string;
			keep?: boolean;
			overwrite?: boolean;
			uri?: string;
		}

		function getBranches (): any;

		function getBuilds (branch: string): any;

		function getInstalledSDKs (force?: boolean): any;

		function getPaths (): any;

		function getReleases (noLatest?: boolean): any;

		function install (params?: InstallParams): any;

		function uninstall (nameOrPath: string): any;
	}
}
