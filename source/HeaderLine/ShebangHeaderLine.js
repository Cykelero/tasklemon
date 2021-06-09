/* Represents a shebang line in a TL script header. */

const HeaderLine = require('./HeaderLine');

module.exports = class ShebangHeaderLine extends HeaderLine {
	constructor(values) {
		super();
		
		this.shebangPath = values.shebangPath;
	}
	
	get requestedRuntimeVersion() {
		const runtimeVersionParts = /\btasklemon-v(\d(\.\d)?)\s*$/.exec(this.shebangPath);
		
		if (!runtimeVersionParts) return null;
		
		return runtimeVersionParts[1];
	}
	
	toString() {
		return `#!${this.shebangPath}`;
	}
	
	static forString(lineString) {
		const lineParts = /^#!(.+)$/.exec(lineString);
		
		if (!lineParts) return null;
		
		return new ShebangHeaderLine({
			shebangPath: lineParts[1]
		});
	}
};
