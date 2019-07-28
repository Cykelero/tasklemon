function getConcreteHeaderLineClasses() {
	return [
		require('./ShebangHeaderLine'),
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
