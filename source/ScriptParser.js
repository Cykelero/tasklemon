/* Exposes script metadata (required packages, etc) and transformations (generate runnable source, pin package versions, etc) based on a TL script's source. */

const path = require('path');
const Tools = require('./Tools');

const Constants = require('./Constants');
const PackageCache = require('./PackageCache');
const HeaderLine = require('./HeaderLine/HeaderLine');
const ShebangHeaderLine = require('./HeaderLine/ShebangHeaderLine');
const RequireHeaderLine = require('./HeaderLine/RequireHeaderLine');
const EmptyHeaderLine = require('./HeaderLine/EmptyHeaderLine');
const LegacyVersionHeaderLine = require('./HeaderLine/LegacyVersionHeaderLine');
const LegacyRequireHeaderLine = require('./HeaderLine/LegacyRequireHeaderLine');

const MODULE_INJECTOR_PATH = path.join(__dirname, 'Injector');

module.exports = class ScriptParser {
	// Exposed
	constructor(source) {
		this.source = source;
	}
	
	get requiredPackages() {
		const regexps = [
			/(?<=npm\.)[\w$_]+/g,
			/(?<=npm\[')[^']+(?='\])/g,
			/(?<=npm\[")[^"]+(?="\])/g
		];
		
		const usedPackages = regexps.reduce((currentValue, regexp) => {
			const matches = this._sourceWithoutHeaders.match(regexp) || [];
			return [...currentValue, ...matches];
		}, []);
		
		const requestedPackages = Object.keys(this.requiredPackageVersions);
		
		const deduplicatedRequiredPackages = Array.from(new Set([...usedPackages, ...requestedPackages]));
		return deduplicatedRequiredPackages;
	}
	
	get requiredPackageVersions() {
		let result = {};
		
		// Read require lines
		this._getHeaderLines()
			.filter(line => line instanceof RequireHeaderLine)
			.forEach(requireLine => {
				requireLine.requiredPackages.forEach(requiredPackage => {
					result[requiredPackage.name] = requiredPackage.version;
				});
			});
		
		// Read legacy require lines
		this._getHeaderLines()
			.filter(line => line instanceof LegacyRequireHeaderLine)
			.forEach(requireLine => {
				result[requireLine.packageName] = requireLine.packageVersion;
			});
		
		return result;
	}
	
	get requiredRuntimeVersion() {
		const currentHeaderLines = this._getHeaderLines();
		
		// Does the shebang contain a runtime version?
		const firstHeaderLine = currentHeaderLines[0];
		if (firstHeaderLine instanceof ShebangHeaderLine) {
			const shebangRequestedVersion = currentHeaderLines[0].requestedRuntimeVersion;
			
			if (shebangRequestedVersion) return shebangRequestedVersion;
		}
		
		// Or, is there a version line?
		const firstVersionLine = currentHeaderLines.find(line => line instanceof LegacyVersionHeaderLine);
		if (firstVersionLine) return firstVersionLine.runtimeVersion;
		
		// Nothing found
		return null;
	}
	
	get preparedSource() {
		const headerNewlineCount = this._getHeaderLines().length;
		const replacementNewlines = '\n'.repeat(headerNewlineCount);
		
		return `require(${JSON.stringify(MODULE_INJECTOR_PATH)})(global);`
			+ '(async function() {'
			+ replacementNewlines
			+ this._sourceWithoutHeaders
			+ '\n})();';
	}
	
	pinRuntimeVersion() {
		const currentHeaderLines = this._getHeaderLines();
		const firstLineIsShebang = currentHeaderLines[0] instanceof ShebangHeaderLine;
		
		if (!firstLineIsShebang) {
			const newHeaderLine = new ShebangHeaderLine({
				shebangPath: Constants.DEFAULT_SHEBANG
			});
			this._prependHeaderLines([newHeaderLine], true);
			
			return true;
		}
		
		return false;
	}
	
	async pinPackageVersions() {
		// Run a synchronous install for the detected packages
		await PackageCache.preloadPackagesForScript(this);
		
		// Load package lock file; parse it for the versions
		const bundlePath = PackageCache.bundlePathForList(this.requiredPackages, this.requiredPackageVersions);
		const packageLockPath = path.join(bundlePath, 'package-lock.json');
		
		const packageLockContent = Tools.readFileOrExitWithErrorSync(
			packageLockPath,
			{ encoding: 'utf8' },
			`Couldn't pin package versions because package loading failed. Make sure you are connected to the Internet.`
		);
		const packageLockInfo = JSON.parse(packageLockContent);
		
		// Extract versions; only keep versions for detected packages that don't have a version yet
		const requiredPackages = this.requiredPackages;
		const alreadyPinnedPackages = Object.keys(this.requiredPackageVersions);
		
		const allPackageLockDependencyNames = [
			...Object.keys(packageLockInfo.packages[''].dependencies || {}),
			...Object.keys(packageLockInfo.packages[''].optionalDependencies || {})
		];
		const deduplicatedPackageLockDependencyNames = Array.from(new Set(allPackageLockDependencyNames));
		
		const detectedPackageVersions = deduplicatedPackageLockDependencyNames
			.map(dependencyName => ({
				name: dependencyName,
				version: packageLockInfo.packages['node_modules/' + dependencyName].version
			}))
			.filter(info => !alreadyPinnedPackages.includes(info.name))
			.filter(info => requiredPackages.includes(info.name));
		
		const allPackageVersions = [
			...packageVersionsObjectToArray(this.requiredPackageVersions),
			...detectedPackageVersions
		];
		
		// Write new lines to source
		if (detectedPackageVersions.length > 0) {
			const newRequireLine = new RequireHeaderLine({requiredPackages: allPackageVersions});
			
			this._replaceHeaderLineAtLandmark(
				newRequireLine,
				line => line instanceof RequireHeaderLine
			);
		}
		
		return detectedPackageVersions;
	}
	
	// Internal
	get _headersString() {
		const headerParts = /^((#.*|\/\/\s*tl:.*|\s*)\n)*/.exec(this.source);
		return headerParts[0];
	}
	
	set _headersString(value) {
		this.source = value + this._sourceWithoutHeaders;
	}
	
	_getHeaderLines() {
		const lineStrings = this._headersString.split('\n').slice(0, -1);
		return lineStrings.map(lineString => HeaderLine.forString(lineString));
	}
	
	_setHeaderLines(value) {
		this._headersString = value
			.map(line => line.toString() + '\n')
			.join('');
	}
	
	_replaceHeaderLineAtIndex(newLine, index) {
		const currentHeaderLines = this._getHeaderLines();
		
		const transformedHeaderLines = [
			...currentHeaderLines.slice(0, index),
			...newLine,
			...currentHeaderLines.slice(index + 1)
		];
		
		this._setHeaderLines(transformedHeaderLines);
	}
	
	_replaceHeaderLineAtLandmark(newLine, landmarkPredicate, padTopIfAppending) {
		const currentHeaderLines = this._getHeaderLines();
		const lastLandmarkLineIndex = findLastIndex(currentHeaderLines, landmarkPredicate);
	
		if (lastLandmarkLineIndex > -1) {
			// Insert after landmark lines
			this._replaceHeaderLineAtIndex([newLine], lastLandmarkLineIndex);
		} else {
			// Add at the end of the header
			this._appendHeaderLines([newLine], padTopIfAppending);
		}
	}
	
	_insertHeaderLinesAtIndex(newLines, index) {
		const currentHeaderLines = this._getHeaderLines();
		
		const transformedHeaderLines = [
			...currentHeaderLines.slice(0, index),
			...newLines,
			...currentHeaderLines.slice(index)
		];
		
		this._setHeaderLines(transformedHeaderLines);
	}
	
	_insertHeaderLinesAfterLandmark(newLines, landmarkPredicate) {
		const currentHeaderLines = this._getHeaderLines();
		const lastLandmarkLineIndex = findLastIndex(currentHeaderLines, landmarkPredicate);
	
		if (lastLandmarkLineIndex > -1) {
			// Insert after landmark lines
			this._insertHeaderLinesAtIndex(newLines, lastLandmarkLineIndex + 1);
		} else {
			// Add at the end of the header
			this._appendHeaderLines(newLines, true);
		}
	}
	
	_prependHeaderLines(newLines, padBottom) {
		const currentHeaderLines = this._getHeaderLines();
		const firstLineIsEmpty = currentHeaderLines[0] && currentHeaderLines[0] instanceof EmptyHeaderLine;
		
		const shouldAppendEmptyLine =
			currentHeaderLines.length === 0
			|| padBottom && !firstLineIsEmpty;
		
		if (shouldAppendEmptyLine) {
			newLines = [...newLines, new EmptyHeaderLine()];
		}
		
		this._insertHeaderLinesAtIndex(newLines, 0);
	}
	
	_appendHeaderLines(newLines, padTop) {
		const currentHeaderLines = this._getHeaderLines();
		const lastNonEmptyLineIndex = findLastIndex(currentHeaderLines, line => !(line instanceof EmptyHeaderLine));
		
		let insertionIndex;
		
		// Pick insertion point
		if (lastNonEmptyLineIndex === -1) {
			insertionIndex = 0;
		} else {
			insertionIndex = lastNonEmptyLineIndex + 1;
			
			if (padTop) {
				newLines = [new EmptyHeaderLine(), ...newLines];
			}
		}
		
		// Add trailing empty line if inserting at the very end
		const insertingAtTheEnd = insertionIndex === currentHeaderLines.length;
		if (insertingAtTheEnd) {
			newLines = [...newLines, new EmptyHeaderLine()];
		}
		
		this._insertHeaderLinesAtIndex(newLines, insertionIndex);
	}
	
	get _sourceWithoutHeaders() {
		return this.source.slice(this._headersString.length);
	}
};

function findLastIndex(array, predicate) {
	for (let i = array.length - 1; i >= 0; i--) {
		if (predicate(array[i])) return i;
	}
	
	return -1;
}

function packageVersionsObjectToArray(object) {
	return Object.entries(object)
		.map(entry => {
			return {
				name: entry[0],
				version: entry[1]
			}
		});
}
