/* Represents a line of an unknown type in a TL script header. */

const HeaderLine = require('./HeaderLine');

module.exports = class OtherHeaderLine extends HeaderLine {
	constructor(values) {
		super();
		
		this.content = values.content;
	}
	
	toString() {
		return this.content;
	}
	
	static forString(lineString) {
		return new OtherHeaderLine({
			content: lineString
		});
	}
};
