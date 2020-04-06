/* Allows loading npm packages, relying on the package cache. */

const ScriptEnvironment = require('../ScriptEnvironment');
const PackageCache = require('../PackageCache');

module.exports = new Proxy({}, {
	get(self, packageName) {
		return PackageCache.get(
			packageName,
			ScriptEnvironment.defaultBundlePackageList,
			ScriptEnvironment.requiredPackageVersions
		);
	}
});
