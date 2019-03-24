const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const crossSpawn = require('cross-spawn');

module.exports = {
	PACKAGE_CACHE_PATH: '..' + path.sep + 'package-cache' + path.sep,
	INDEX_FILE_NAME: 'index.js',
	
	_defaultBundlePackageList: null,
	_synchronouslyPreparedPackages: new Set(),
	
	// Exposed
	preloadPackageBundle(packageList) {
		const normalizedPackageList = this._normalizePackageList(packageList);
		
		if (packageList.length > 0) {
			this._defaultBundlePackageList = normalizedPackageList;
			this._prepareBundleForList(normalizedPackageList);
		}
	},
	
	get(packageName) {
		const dedicatedBundlePackageList = this._dedicatedBundlePackageListFor(packageName);
		
		let package;
		
		// Try loading package from default bundle
		if (this._defaultBundlePackageList) {
			package = this._getFromBundle(packageName, this._defaultBundlePackageList);
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
	
	bundlePathForList(packageList) {
		const normalizedPackageList = this._normalizePackageList(packageList);
		return this.bundlePathForHash(this._bundleHashForList(normalizedPackageList));
	},
	
	bundlePathForHash(packageHash) {
		return path.join(
			__dirname,
			this.PACKAGE_CACHE_PATH,
			packageHash
		) + path.sep;
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
		const bundleIndexPath = this.bundlePathForList(packageList) + this.INDEX_FILE_NAME;
		
		let bundleIndex;
		
		try {
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
				bundleIndex = require(bundleIndexPath);
			} catch(e) {
				throw Error(`Package “${packageName}” could not be retrieved: the package cache bundle preparation process is failing. Make sure the names of your packages are correct.`);
			}
		}
		
		return bundleIndex(packageName);
	},
	
	_markBundleForDeletion(packageList) {
		const bundleIndexPath = this.bundlePathForList(packageList) + this.INDEX_FILE_NAME;
		try {
			fs.unlink(bundleIndexPath, () => {});
		} catch(e) {}
	},
	
	// // Tools
	_normalizePackageList(packageList) {
		const normalized = packageList.map(packageName => /[^\/]+/.exec(packageName)[0])
		const deduplicated = Array.from(new Set(normalized));
		return deduplicated;
	},
	
	_dedicatedBundlePackageListFor(packageName) {
		return this._normalizePackageList([packageName]);
	},
	
	_bundleHashForList(packageList) {
		const sortedList = packageList.slice(0).sort();
		const result = crypto.createHash('sha256').update(sortedList.join()).digest('hex');
		return result;
	},
	
	_nodeArgumentsForList(packageList) {
		return [
			path.join(__dirname, 'preparePackageCacheBundle.js'),
			...packageList
		];
	}
};
