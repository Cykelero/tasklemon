/* Deprecated. Represents a package requirement line in a TL script header. */
/* Replaced by LegacyRequireHeaderLine. */

const HeaderLine = require('./HeaderLine');

module.exports = class LegacyRequireHeaderLine extends HeaderLine {
	constructor(values) {
		super();
		
		this.packageName = values.packageName;
		this.packageVersion = values.packageVersion;
	}
	
	toString() {
		return `#require ${this.packageName}@${this.packageVersion}`;
	}
	
	static forString(lineString) {
		const lineParts = /^#require\s+([^\s]+)@([^@\s]+)\s*$/.exec(lineString);
		
		if (!lineParts) return null;
		
		return new LegacyRequireHeaderLine({
			packageName: lineParts[1],
			packageVersion: lineParts[2]
		});
	}
};
