const path = require('path');
const fs = require('fs');
const childProcess = require('child_process');
const crypto = require('crypto');

const crossSpawn = require('cross-spawn');

module.exports = {
	PACKAGE_CACHE_PATH: '..' + path.sep + 'package-cache' + path.sep,
	INDEX_FILE_NAME: 'index.js',
	
	_defaultBundlePackageList: null,
	_synchronouslyPreparedPackages: new Set(),
	
	// Exposed
	preloadPackageBundle(packageList) {
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
			this._markBundleForDeletion([packageName]);
			throw Error(`Package “${packageName}” could not be retrieved. Make sure its name is correct and that you are connected to the Internet.`);
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
		childProcess.spawnSync('node', this._nodeArgumentsForList(packageList));
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
				throw Error(`Package “${packageName}” could not be retrieved: the package cache bundle preparation process is failing.`);
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
