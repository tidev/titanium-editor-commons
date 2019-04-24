

declare module 'titaniumlib' {
	namespace sdk {
		
		interface InstallParams {

		}

		function getBranches(): any;
	
		function getBuilds(branch: string): any;
	
		function getInstalledSDKs(force?: boolean): any;
	
		function getPaths(): any;
	
		function getReleases(noLatest?: boolean): any;
	
		function install(params: any): any;
	
		function uninstall(nameOrPath: InstallParams): any;
	}
}
