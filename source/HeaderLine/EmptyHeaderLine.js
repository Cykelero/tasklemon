const HeaderLine = require('./HeaderLine');

module.exports = class EmptyHeaderLine extends HeaderLine {
	toString() {
		return ``;
	}
	
	static forString(lineString) {
		const lineParts = /^\s*$/.exec(lineString);
		
		if (!lineParts) return null;
		
		return new EmptyHeaderLine();
	}
};
