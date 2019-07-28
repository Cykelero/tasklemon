const HeaderLine = require('./HeaderLine');

module.exports = class ShebangHeaderLine extends HeaderLine {
	constructor(values) {
		super();
		
		this.shebangPath = values.shebangPath;
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
