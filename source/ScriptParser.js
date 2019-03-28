const path = require('path');

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
	
	// Internal
	get _headers() {
		const headerParts = /^((#.*|\s*)\n)*/.exec(this.source);
		return headerParts[0];
	}
	
	get _sourceWithoutHeaders() {
		return this.source.slice(this._headers.length);
	}
};
