/* Handles preparing and loading cache bundles. Relies on preparePackageCacheBundle.js. */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const crossSpawn = require('cross-spawn');
const rimraf = require('rimraf');

const Constants = require('./Constants');
const Tools = require('./Tools');
const RuntimeVersion = require('./RuntimeVersion');

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
		const deletedBundleCount = fs.readdirSync(this.PACKAGE_CACHE_PATH)
			.filter(path => path.charAt(0) !== '.')
			.length;
		
		rimraf.sync(this.PACKAGE_CACHE_PATH + '*');
		
		return deletedBundleCount;
	},
	
	get(importPath, rawRequestedBundlePackageList, packageVersions) {
		const requestedBundlePackageList = this._normalizePackageList(rawRequestedBundlePackageList, packageVersions);
		const dedicatedBundlePackageList = this._dedicatedBundlePackageListFor(importPath, packageVersions);
		
		let packageObject;
		
		// Try loading package from requested bundle
		if (requestedBundlePackageList) {
			packageObject = this._getFromBundle(importPath, requestedBundlePackageList);
		}
		
		// Try loading package from dedicated bundle
		if (!packageObject) {
			packageObject = this._getFromBundle(importPath, dedicatedBundlePackageList);
		}
		
		// If the dedicated bundle was present but incorrectly prepared, try again
		if (!packageObject) {
			packageObject = this._getFromBundle(importPath, dedicatedBundlePackageList);
		}
		
		// Couldn't load bundle
		if (!packageObject) {
			this._markBundleForDeletion(dedicatedBundlePackageList);
			
			const packageName = this.packageNameForImportPath(importPath);
			throw Error(`Package “${packageName}” could not be retrieved. Make sure its name is correct and that you are connected to the Internet.`);
		}
		
		return packageObject;
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
		this._ensurePackageCacheFolderExists();
		
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
		this._ensurePackageCacheFolderExists();
		
		crossSpawn.sync('node', this._nodeArgumentsForList(packageList));
	},
	
	_getFromBundle(importPath, packageList) {
		const packageName = this.packageNameForImportPath(importPath);
		const bundleIndexPath = this._bundlePathForList(packageList) + this.INDEX_FILE_NAME;
		
		let bundleIndex;
		
		try {
			// First, try to load any existing package index
			if (!fs.existsSync(bundleIndexPath)) throw false;
			bundleIndex = require(bundleIndexPath);
		} catch(e) {
			// Loading failed: try installing
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
				// Something is very wrong: preparePackageCacheBundle.js shouldn't ever fail, as it installs all packages as optional dependencies
				throw Error(`Package “${packageName}” could not be retrieved: the package cache bundle preparation process is failing. Make sure the names of your packages are correct.`);
			}
		}
		
		const flattenedImportPath = importPath.replace(/:/g, '/');
		return bundleIndex(flattenedImportPath);
	},
	
	_markBundleForDeletion(packageList) {
		const bundleIndexPath = this._bundlePathForList(packageList) + this.INDEX_FILE_NAME;
		try {
			fs.unlink(bundleIndexPath, () => {});
		} catch(e) {}
	},
	
	_ensurePackageCacheFolderExists() {
		const message = `Couldn't create cache folder at “${Constants.CACHE_PATH}” because of error: “$0”`;
		const cacheFolderParent = path.parse(Constants.CACHE_PATH).dir;
		
		Tools.ensureFolderExistsOrExitWithErrorSync(cacheFolderParent, message);
		Tools.ensureFolderExistsOrExitWithErrorSync(Constants.CACHE_PATH, message);
		Tools.ensureFolderExistsOrExitWithErrorSync(this.PACKAGE_CACHE_PATH, message);
	},
	
	// // Tools
	packageNameForImportPath(importPath) {
		if (RuntimeVersion.isLowerThan('0.3')) {
			importPath = importPath.replace(/\//g, ':');
		}
		
		return importPath.split(":")[0];
	},
	
	_normalizePackageList(packageList, packageVersions = {}) {
		const normalized = packageList
			.map(importPath => {
				const packageName = this.packageNameForImportPath(importPath);
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
	
	_dedicatedBundlePackageListFor(importPath, packageVersions) {
		return this._normalizePackageList([importPath], packageVersions);
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
