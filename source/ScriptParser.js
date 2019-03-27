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
		
		return regexps.reduce((currentValue, regexp) => {
			const matches = this._sourceWithoutHeaders.match(regexp) || [];
			return currentValue.concat(matches);
		}, []);
	}
	
	get preparedSource() {
		return `require(${JSON.stringify(MODULE_INJECTOR_PATH)})(global);`
			+ '(async function() {'
			+ this._sourceWithoutHeaders
			+ '\n})();';
	}
	
	// Internal
	get _headers() {
		const headerParts = /^#!.+\n/.exec(this.source);
		return headerParts ? headerParts[0] : '';
	}
	
	get _sourceWithoutHeaders() {
		return this.source.slice(this._headers.length);
	}
};
