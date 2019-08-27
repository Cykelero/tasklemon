const path = require('path');
const Tools = require('./Tools');

const Constants = require('./Constants');
const PackageCache = require('./PackageCache');
const HeaderLine = require('./HeaderLine/HeaderLine');
const ShebangHeaderLine = require('./HeaderLine/ShebangHeaderLine');
const VersionHeaderLine = require('./HeaderLine/VersionHeaderLine');
const RequireHeaderLine = require('./HeaderLine/RequireHeaderLine');
const EmptyHeaderLine = require('./HeaderLine/EmptyHeaderLine');

const MODULE_INJECTOR_PATH = path.join(__dirname, 'injected-modules', 'Injector');

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
		
		return [...usedPackages, ...requestedPackages];
	}
	
	get requiredPackageVersions() {
		let result = {};
		
		this._getHeaderLines()
			.filter(line => line instanceof RequireHeaderLine)
			.forEach(requireLine => {
				result[requireLine.packageName] = requireLine.packageVersion;
			});
		
		return result;
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
		const someLineIsVersionLine = currentHeaderLines.some(line => line instanceof VersionHeaderLine);
		
		let didChangeHeaders = false;
		
		// Add shebang line
		if (!firstLineIsShebang) {
			const newHeaderLine = new ShebangHeaderLine({
				shebangPath: Constants.DEFAULT_SHEBANG
			});
		
			this._prependHeaderLines([newHeaderLine], true);
			didChangeHeaders = true;
		}
		
		// Add runtime version line
		if (!someLineIsVersionLine) {
			const newVersionLine = new VersionHeaderLine({
				runtimeVersion: Constants.WIDE_RUNTIME_VERSION_SPECIFIER
			});
		
			this._insertHeaderLinesAfterLandmark(
				[newVersionLine],
				line => line instanceof ShebangHeaderLine
			);
			didChangeHeaders = true;
		}
		
		return didChangeHeaders;
	}
	
	pinPackageVersions() {
		// Run a synchronous install for the detected packages
		PackageCache.loadPackageBundleSync(this.requiredPackages, this.requiredPackageVersions);
		
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
		
		const versionsForPackages = Object.entries(packageLockInfo.dependencies)
			.map(entries => {
				return {
					name: entries[0],
					version: entries[1].version
				}
			})
			.filter(info => !alreadyPinnedPackages.includes(info.name))
			.filter(info => requiredPackages.includes(info.name));
		
		// Write new lines to source
		if (versionsForPackages.length > 0) {
			const newHeaderLines = versionsForPackages.map(info =>
				new RequireHeaderLine({
					packageName: info.name,
					packageVersion: info.version,
				})
			);
			
			this._insertHeaderLinesAfterLandmark(
				newHeaderLines,
				line => line instanceof RequireHeaderLine
			);
		}
		
		return versionsForPackages;
	}
	
	// Internal
	get _headersString() {
		const headerParts = /^((#.*|\s*)\n)*/.exec(this.source);
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
