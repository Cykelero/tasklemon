/* Environment variables about the TL script being currently run, for use mostly by injected modules. */

// Currently, this object is unique (i.e. we can't run multiple scripts side-by-side)
module.exports = {
	sourceScriptPath: null,
	requiredRuntimeVersion: null,
	rawArguments: null,
	defaultBundlePackageList: null,
	requiredPackageVersions: null,
	muteInfoMessages: null
};
