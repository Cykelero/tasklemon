/* Handles preparing and loading cache bundles. Relies on preparePackageCacheBundle.js. */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const crossSpawn = require('cross-spawn');
const rimraf = require('rimraf');

const Constants = require('./Constants');
const ScriptEnvironment = require('./ScriptEnvironment');
const RuntimeVersion = require('./RuntimeVersion');
const Tools = require('./Tools');

module.exports = {
	PACKAGE_CACHE_PATH: path.join(Constants.CACHE_PATH, 'npm-packages', path.sep),
	INDEX_FILE_NAME: 'index.js',
	CACHE_BUNDLE_VERSION_COMMENT:
		fs.readFileSync(
			path.join(__dirname, 'packageCacheBundleIndexFile.template.js'),
			{ encoding: 'utf8' }
		)
		.split('\n')[0],
	CACHE_BUNDLE_PREPARATION_ERROR_LOG_PATH: path.join(__dirname, '..', 'preparePackageCacheBundle.errors.log'),
	
	_loadedESMExports: {},
	
	_didRecentlyShowPreparingMessage: false,
	_encounteredESMImportErrorsByImportPath: {},
	
	// Exposed
	async preloadPackagesForScript(scriptParser) {
		const packageList = this._normalizePackageList(scriptParser.requiredPackages, scriptParser.requiredPackageVersions);
		
		if (packageList.length > 0) {
			// Prepare package bundle
			const bundleIndexPath = this._bundlePathForList(packageList) + this.INDEX_FILE_NAME;
			if (!fs.existsSync(bundleIndexPath)) {
				this._showPreparingMessage();
				this._prepareBundleForListSync(packageList);
			}
			
			// Preload all ESM exports
			if (RuntimeVersion.isAtLeast('0.5')) {
				for (let importPath of scriptParser.requiredPackages) {
					const moduleExports = await this._loadESMModuleExports(
						importPath,
						scriptParser.requiredPackages,
						scriptParser.requiredPackageVersions
					);
					
					if (moduleExports) {
						this._loadedESMExports[importPath] = moduleExports;
					}
				}
			}
		}
	},
	
	clearAll() {
		const deletedBundleCount = fs.readdirSync(this.PACKAGE_CACHE_PATH)
			.filter(path => path.charAt(0) !== '.')
			.length;
		
		rimraf.sync(this.PACKAGE_CACHE_PATH + '*');
		
		return deletedBundleCount;
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
	
	getModuleESMExports(importPath) {
		return this._loadedESMExports[importPath] || null;
	},
	
	getModuleCommonJSExports(importPath, rawRequestedBundlePackageList, packageVersions) {
		return this._loadCommonJSModuleExports(importPath, rawRequestedBundlePackageList, packageVersions);
	},
	
	// Internal
	_prepareBundleForListSync(packageList) {
		this._ensurePackageCacheFolderExists();
		
		crossSpawn.sync('node', this._nodeArgumentsForList(packageList));
	},
	
	/// Returns the exports of an installed ESM module. Doesn't do anything with the network.
	async _loadESMModuleExports(importPath, rawRequestedBundlePackageList, packageVersions) {
		const requestedBundlePackageList = this._normalizePackageList(rawRequestedBundlePackageList, packageVersions);
		const flattenedImportPath = importPath.replace(/:/g, '/');
		
		const bundleIndex = this._loadBundleIndex(requestedBundlePackageList);
		if (!bundleIndex) return null;
		
		try {
			return await bundleIndex.importModuleAtPath(flattenedImportPath);
		} catch (error) {
			this._encounteredESMImportErrorsByImportPath[importPath] = error;
			return null;
		}
	},
	
	/// Returns the exports of a CommonJS module. Tries loading the requested bundle first, and fallbacks to a dedicated bundle for the package.
	_loadCommonJSModuleExports(importPath, rawRequestedBundlePackageList, packageVersions) {
		const requestedBundlePackageList = this._normalizePackageList(rawRequestedBundlePackageList, packageVersions);
		const dedicatedBundlePackageList = this._dedicatedBundlePackageListFor(importPath, packageVersions);
		
		const packageName = this._packageNameForImportPath(importPath);
		const flattenedImportPath = importPath.replace(/:/g, '/');
		
		let packageObject;
		let commonJSError = null;
		
		// Try loading package from requested bundle
		if (requestedBundlePackageList) {
			const requestedBundleIndex = this._loadBundleIndex(requestedBundlePackageList);
			
			try {
				packageObject = requestedBundleIndex.requireModuleAtPath(flattenedImportPath);
			} catch (error) {}
		}
		
		// Try loading package from dedicated bundle
		if (!packageObject) {
			const dedicatedBundleIndex = this._loadBundleIndex(dedicatedBundlePackageList);
			
			try {
				packageObject = dedicatedBundleIndex.requireModuleAtPath(flattenedImportPath);
			} catch (error) {}
		}
		
		// In case the dedicated bundle was already present but incorrectly prepared, try again
		if (!packageObject) {
			this._markBundleForDeletion(dedicatedBundlePackageList);
			const dedicatedBundleIndex = this._loadBundleIndex(dedicatedBundlePackageList);
			
			if (dedicatedBundleIndex) {
				try {
					packageObject = dedicatedBundleIndex.requireModuleAtPath(flattenedImportPath);
				} catch (error) {
					// This was the last resort, so let's hold onto the error this time
					commonJSError = error;
				}
			}
		}
		
		// Couldn't load bundle
		if (!packageObject) {
			this._markBundleForDeletion(dedicatedBundlePackageList);
			
			// Since CommonJS loading is the last tried strategy, throw
			let errorIntroText = '';
			
			let esmErrorText = '';
			let commonJSErrorText = '';
			
			// // Error intro
			const relativeImportPath = importPath.slice(packageName.length + 1);
			if (relativeImportPath !== '') {
				errorIntroText = `Module “${relativeImportPath}” from package “${packageName}” could not be loaded. If you are sure the name and import path are correct, and are connected to the Internet, see below for error details`;
			} else {
				errorIntroText = `Package “${packageName}” could not be loaded. If you are sure the name is correct and are connected to the Internet, see below for error details.`;
			}
			
			// // Meaningful error while importing ESM exports?
			const esmError = this._encounteredESMImportErrorsByImportPath[importPath];
			if (esmError && esmError.message && !esmError.message.startsWith('Cannot find package \'')) {
				esmErrorText =
					'\n\n'
					+ 'ESM import attempt\n'
					+ '==================\n'
					+ esmError.message;
			}
			
			// // Meaningful error while requiring CommonJS module?
			if (commonJSError && commonJSError.message && !commonJSError.message.startsWith('Cannot find module \'')) {
				const processedErrorMessage =
					commonJSError.message
					.split('Require stack:')[0];
				
				commonJSErrorText =
					'\n\n'
					+ 'CommonJS require attempt\n'
					+ '========================\n'
					+ processedErrorMessage;
			}
			
			throw Error(
				errorIntroText
				+ esmErrorText
				+ commonJSErrorText
				+ '\n\n'
				+ 'Install process\n'
				+ '===============\n'
				+ 'The install log is located at: ' + this.CACHE_BUNDLE_PREPARATION_ERROR_LOG_PATH
				+ '\n\n'
				+ 'Callstack\n'
				+ '========='
			);
		}
		
		return packageObject;
	},
	
	/// Tries to require the bundle's index. If initially unsuccessful, tries preparing the bundle once and requires again.
	/// Preparing the bundle should only happen for dedicated bundles for CommonJS packages, as ESM packages can only be loaded ahead of time.
	_loadBundleIndex(packageList) {
		const bundleIndexPath = this._bundlePathForList(packageList) + this.INDEX_FILE_NAME;
		
		let bundleIndex;
		
		try {
			// First, try to load any existing package index
			if (!fs.existsSync(bundleIndexPath)) throw false;
			bundleIndex = require(bundleIndexPath);
		} catch(e) {
			// Loading failed: try installing
			this._showPreparingMessage();
			this._prepareBundleForListSync(packageList);
		}
		
		if (!bundleIndex) {
			try {
				delete(require.cache[bundleIndexPath]);
				bundleIndex = require(bundleIndexPath);
			} catch(e) {
				// Something is very wrong: preparePackageCacheBundle.js shouldn't ever fail, even if the `npm install` call fails
				// An error will be shown to the user later, at the end of _loadCommonJSModuleExports
				return null;
			}
		}
		
		return bundleIndex;
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
	_packageNameForImportPath(importPath) {
		if (RuntimeVersion.isLowerThan('0.3')) {
			importPath = importPath.replace(/\//g, ':');
		}
		
		return importPath.split(':')[0];
	},
	
	_normalizePackageList(packageList, packageVersions = {}) {
		const normalized = packageList
			.map(importPath => {
				const packageName = this._packageNameForImportPath(importPath);
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
		// The hash depends on included packages, their versions, and the cache bundle version
		const sortedList = packageList.slice(0).sort();
		
		return crypto.createHash('sha256')
			.update(sortedList.join())
			.update(this.CACHE_BUNDLE_VERSION_COMMENT)
			.digest('hex');
	},
	
	_bundlePathForList(packageList) {
		return this.bundlePathForHash(this._bundleHashForList(packageList));
	},
	
	_nodeArgumentsForList(packageList) {
		return [
			path.join(__dirname, 'preparePackageCacheBundle.js'),
			...packageList
		];
	},
	
	_showPreparingMessage() {
		if (!this._didRecentlyShowPreparingMessage) {
			if (!ScriptEnvironment.muteInfoMessages) {
				process.stdout.write('Preparing packages...\n');
			}
			
			this._didRecentlyShowPreparingMessage = true;
			setImmediate(() => {
				this._didRecentlyShowPreparingMessage = false;
			});
		}
	}
};
