/* Environment variables about the TL script being currently run, for use by injected modules. */

module.exports = {
// Currently, this object is unique (i.e. we can't run multiple scripts side-by-side)
	sourceScriptPath: null,
	rawArguments: null,
	defaultBundlePackageList: null,
	requiredPackageVersions: null
};
