let format = module.exports;

format.number = function() {
	return format.number.float.apply(this, arguments);
};

format.number.integer = function(value, unit) {
	return format.number.float(value, unit, 0);
};

format.number.float = function(value, unit, decimalPlaces = 2) {
	let result = '';
	
	let [, integerPart, , fractionalPart] = /(\d+)(\.(\d+))?/.exec(value);

	// Build comma-separated integer part
	const extraZeroCount = 3 - integerPart.length % 3;
	integerPart = '0'.repeat(extraZeroCount) + integerPart;
	integerPart = integerPart.replace(/\d\d\d/g, ',$&').slice(1 + extraZeroCount);
	
	result += integerPart;
	
	// Pad and truncate fractional part
	if (decimalPlaces > 0) {
		result += '.';
		result += (fractionalPart || '').substr(0, decimalPlaces).padEnd(decimalPlaces, '0');
	}
	
	// Add and pluralize unit
	if (unit) {
		if (!Array.isArray(unit)) unit = [unit, unit + 's'];
		result += ' ';
		result += (value === 1 ? unit[0] : unit[1]);
	}
	
	// Return
	return result;
};
