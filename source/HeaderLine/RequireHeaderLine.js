const HeaderLine = require('./HeaderLine');

module.exports = class RequireHeaderLine extends HeaderLine {
	constructor(values) {
		super();
		
		this.packageName = values.packageName;
		this.packageVersion = values.packageVersion;
	}
	
	toString() {
		return `#require ${this.packageName}@${this.packageVersion}`;
	}
	
	static forString(lineString) {
		const lineParts = /^#require\s+([^@ ]+)@([^ ]+)\s*$/.exec(lineString);
		
		if (!lineParts) return null;
		
		return new RequireHeaderLine({
			packageName: lineParts[1],
			packageVersion: lineParts[2]
		});
	}
};
