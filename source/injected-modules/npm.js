const Environment = require('./Environment');
const PackageCache = require('../PackageCache');

module.exports = new Proxy({}, {
	get(self, packageName) {
		return PackageCache.get(packageName, Environment.defaultBundlePackageList);
	}
});
