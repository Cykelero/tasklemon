const path = require('path');
const childProcess = require('child_process');
const crypto = require('crypto');

module.exports = {
	PACKAGE_CACHE_PATH: '..' + path.sep + 'package-cache' + path.sep,
	INDEX_FILE_NAME: 'index.js',
	
	_defaultBundlePackageList: null,
	
	// Exposed
	preloadPackageList(packageList) {
		if (packageList.length > 0) {
			this._defaultBundlePackageList = packageList;
			this._prepareBundleForList(packageList);
		}
	},
	
	get(packageName) {
		let package;
		
		// Try loading package from default bundle
		if (this._defaultBundlePackageList) {
			package = this._getFromBundle(packageName, this._defaultBundlePackageList);
		}
		
		// Try loading package from dedicated bundle
		if (!package) {
			package = this._getFromBundle(packageName, [packageName]);
		}
		
		// Couldn't load bundle
		if (!package) {
			throw Error(`Package ${packageName} can not be retrieved. Make sure its name is correct and that you are connected to the Internet.`);
		}
		
		return package;
	},
	
	bundlePathForList(packageList) {
		return this.bundlePathForHash(this._bundleHashForList(packageList));
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
		const preparationProcess = childProcess.spawn(
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
		childProcess.spawnSync('node', this._nodeArgumentsForList(packageList));
	},
	
	_getFromBundle(packageName, packageList) {
		const bundleIndexPath = this.bundlePathForList(packageList) + this.INDEX_FILE_NAME;
		
		let bundleIndex;
		
		try {
			bundleIndex = require(bundleIndexPath);
		} catch(e) {
			console.log('Preparing packages...');
			this._prepareBundleForListSync(packageList);
		}
		
		if (!bundleIndex) {
			try {
				bundleIndex = require(bundleIndexPath);
			} catch(e) {
				throw Error(`Package ${packageName} could not be retrieved: the package cache bundle preparation process is failing.`);
			}
		}
		
		return bundleIndex(packageName);
	},
	
	// // Tools
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
