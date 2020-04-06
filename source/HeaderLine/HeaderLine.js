/* Represents a single line of a TL script header. Needs subclassing to specify the line type. */

function getConcreteHeaderLineClasses() {
	return [
		require('./ShebangHeaderLine'),
		require('./VersionHeaderLine'),
		require('./RequireHeaderLine'),
		require('./EmptyHeaderLine'),
		require('./OtherHeaderLine')
	];
}

module.exports = class HeaderLine {
	toString() {}
	
	static forString(lineString) {
		let result;
		
		let classes = getConcreteHeaderLineClasses();
		while (!result) {
			const klass = classes.shift();
			result = klass.forString(lineString);
		}
		
		return result;
	}
};
