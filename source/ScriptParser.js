const path = require('path');
const Tools = require('./Tools');

const PackageCache = require('./PackageCache');

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
		
		const headerLineRegex = /(?<=\n)#require ([^@ \n]+)@([^ \n]+)/g;
		
		let match;
		while (match = headerLineRegex.exec(this._headers)) {
			const [, packageName, packageVersion] = match;
			
			result[packageName] = packageVersion;
		}
		
		return result;
	}
	
	get preparedSource() {
		const headerNewlineCount = (this._headers.match(/\n/g) || []).length;
		const replacementNewlines = '\n'.repeat(headerNewlineCount);
		
		return `require(${JSON.stringify(MODULE_INJECTOR_PATH)})(global);`
			+ '(async function() {'
			+ replacementNewlines
			+ this._sourceWithoutHeaders
			+ '\n})();';
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
		let newHeaderLines = versionsForPackages.map(info => `#require ${info.name}@${info.version}\n`);
		
		const headerLineRegex = /(?<=\n)#require ([^@ \n]+)@([^ \n]+)/g;
		let linesInsertionPoint = null;
		
		while (headerLineRegex.exec(this._headers)) {
			linesInsertionPoint = headerLineRegex.lastIndex + 1;
		}
		
		if (linesInsertionPoint === null) {
			linesInsertionPoint = this._headers.length;
			newHeaderLines.push('\n');
		}
		
		this.source =
			this.source.slice(0, linesInsertionPoint)
			+ newHeaderLines.join('')
			+ this.source.slice(linesInsertionPoint);
	}
	
	// Internal
	get _headers() {
		const headerParts = /^((#.*|\s*)\n)*/.exec(this.source);
		return headerParts[0];
	}
	
	get _sourceWithoutHeaders() {
		return this.source.slice(this._headers.length);
	}
};
