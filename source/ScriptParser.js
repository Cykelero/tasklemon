const path = require('path');

const MODULE_INJECTOR_PATH = path.join(__dirname, 'injected-modules', 'injector');

module.exports = class ScriptParser {
	// Exposed
	constructor(source) {
		this.source = source;
	}
	
	get requiredPackages() {
		return this._sourceWithoutHeaders.match(/(?<=npm\.)[\w$_]+/g) || [];
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
