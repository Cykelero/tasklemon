/* Deprecated. Represents a Tasklemon runtime version line in a TL script header. */
/* Version pinning is now done in the script's shebang. */

const HeaderLine = require('./HeaderLine');

module.exports = class LegacyVersionHeaderLine extends HeaderLine {
	constructor(values) {
		super();
		
		this.runtimeVersion = values.runtimeVersion;
	}
	
	toString() {
		return `#version ${this.runtimeVersion}`;
	}
	
	static forString(lineString) {
		const lineParts = /^#version\s+([^\s]+)\s*$/.exec(lineString);
		
		if (!lineParts) return null;
		
		return new LegacyVersionHeaderLine({
			runtimeVersion: lineParts[1]
		});
	}
};
