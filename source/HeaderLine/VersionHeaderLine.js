const HeaderLine = require('./HeaderLine');

module.exports = class VersionHeaderLine extends HeaderLine {
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
		
		return new VersionHeaderLine({
			runtimeVersion: lineParts[1]
		});
	}
};
