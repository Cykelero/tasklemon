/* Allows loading npm packages, relying on the package cache. */

const ScriptEnvironment = require('../../ScriptEnvironment');
const PackageCache = require('../../PackageCache');

module.exports = new Proxy({}, {
	get(self, importPath) {
		return PackageCache.get(
			importPath,
			ScriptEnvironment.defaultBundlePackageList,
			ScriptEnvironment.requiredPackageVersions
		);
	}
});
