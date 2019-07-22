const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const crossSpawn = require('cross-spawn');
const rimraf = require('rimraf');

const Constants = require('./Constants');

module.exports = {
	PACKAGE_CACHE_PATH: path.join(Constants.CACHE_PATH, 'npm-packages', path.sep),
	INDEX_FILE_NAME: 'index.js',
	
	_synchronouslyPreparedPackages: new Set(),
	
	// Exposed
	loadPackageBundle(rawPackageList, packageVersions) {
		const packageList = this._normalizePackageList(rawPackageList, packageVersions);
		
		if (packageList.length > 0) {
			this._prepareBundleForList(packageList);
		}
	},

	loadPackageBundleSync(rawPackageList, packageVersions) {
		const packageList = this._normalizePackageList(rawPackageList, packageVersions);
		
		if (packageList.length > 0) {
			this._prepareBundleForListSync(packageList);
		}
	},
	
	clearAll() {
		rimraf.sync(this.PACKAGE_CACHE_PATH + '*');
	},
	
	get(packageName, rawRequestedBundlePackageList, packageVersions) {
		const requestedBundlePackageList = this._normalizePackageList(rawRequestedBundlePackageList, packageVersions);
		const dedicatedBundlePackageList = this._dedicatedBundlePackageListFor(packageName, packageVersions);
		
		let package;
		
		// Try loading package from requested bundle
		if (requestedBundlePackageList) {
			package = this._getFromBundle(packageName, requestedBundlePackageList);
		}
		
		// Try loading package from dedicated bundle
		if (!package) {
			package = this._getFromBundle(packageName, dedicatedBundlePackageList);
		}
		
		// Couldn't load bundle
		if (!package) {
			this._markBundleForDeletion(dedicatedBundlePackageList);
			throw Error(`Package “${packageName}” could not be retrieved. Make sure its name is correct and that you are connected to the Internet.`);
		}
		
		return package;
	},
	
	bundlePathForHash(packageHash) {
		return this.PACKAGE_CACHE_PATH + packageHash + path.sep;
	},
	
	bundlePathForList(rawPackageList, packageVersions) {
		const packageList = this._normalizePackageList(rawPackageList, packageVersions);
		return this.bundlePathForHash(this._bundleHashForList(packageList));
	},
	
	readableRequiredPackageListFor(rawPackageList, packageVersions) {
		return this._normalizePackageList(rawPackageList, packageVersions).join(', ');
	},
	
	// Internal
	_prepareBundleForList(packageList) {
		const preparationProcess = crossSpawn(
			'node',
			this._nodeArgumentsForList(packageList),
			{
				detached: true,
				stdio: 'ignore'
			}
		);
		preparationProcess.unref();
	},
	
	_prepareBundleForListSync(packageList) {
		crossSpawn.sync('node', this._nodeArgumentsForList(packageList));
	},
	
	_getFromBundle(packageName, packageList) {
		const bundleIndexPath = this._bundlePathForList(packageList) + this.INDEX_FILE_NAME;
		
		let bundleIndex;
		
		try {
			if (!fs.existsSync(bundleIndexPath)) throw false;
			bundleIndex = require(bundleIndexPath);
		} catch(e) {
			if (!this._synchronouslyPreparedPackages.has(packageName)) {
				this._synchronouslyPreparedPackages.add(packageName);
				process.stdout.write('Preparing packages...\n');
			}
			this._prepareBundleForListSync(packageList);
		}
		
		if (!bundleIndex) {
			try {
				delete(require.cache[bundleIndexPath]);
				bundleIndex = require(bundleIndexPath);
			} catch(e) {
				throw Error(`Package “${packageName}” could not be retrieved: the package cache bundle preparation process is failing. Make sure the names of your packages are correct.`);
			}
		}
		
		return bundleIndex(packageName);
	},
	
	_markBundleForDeletion(packageList) {
		const bundleIndexPath = this._bundlePathForList(packageList) + this.INDEX_FILE_NAME;
		try {
			fs.unlink(bundleIndexPath, () => {});
		} catch(e) {}
	},
	
	// // Tools
	_normalizePackageList(packageList, packageVersions = {}) {
		const normalized = packageList
			.map(packageName => /[^\/]+/.exec(packageName)[0])
			.map(packageName => {
				const packageVersion = packageVersions[packageName];
				
				if (packageVersion) {
					return packageName + '@' + packageVersion;
				} else {
					return packageName;
				}
			});
		const deduplicated = Array.from(new Set(normalized));
		
		return deduplicated;
	},
	
	_dedicatedBundlePackageListFor(packageName, packageVersions) {
		return this._normalizePackageList([packageName], packageVersions);
	},
	
	_bundleHashForList(packageList) {
		const sortedList = packageList.slice(0).sort();
		const result = crypto.createHash('sha256').update(sortedList.join()).digest('hex');
		return result;
	},
	
	_bundlePathForList(packageList) {
		return this.bundlePathForHash(this._bundleHashForList(packageList));
	},
	
	_nodeArgumentsForList(packageList) {
		return [
			path.join(__dirname, 'preparePackageCacheBundle.js'),
			...packageList
		];
	}
};
