let format = module.exports;

format.number = function() {
	return format.number.float.apply(this, arguments);
};

format.number.integer = function(value) {
	return format.number.float(value, 0);
};

format.number.float = function(value, decimalPlaces = 2) {
	const [, integerPart, , fractionalPart] = /(\d+)(\.(\d+))?/.exec(value);

	let formattedIntegerPart;
	let formattedFractionalPart;

	// Build comma-separated integer part
	const extraZeroCount = 3 - integerPart.length % 3;
	formattedIntegerPart = '0'.repeat(extraZeroCount) + integerPart;
	formattedIntegerPart = formattedIntegerPart.replace(/\d\d\d/g, ',$&').slice(1 + extraZeroCount);
	
	// Pad and truncate fractional part
	formattedFractionalPart = (fractionalPart || '').substr(0, decimalPlaces).padEnd(decimalPlaces, '0');
	
	// Return
	if (decimalPlaces > 0) {
		return `${formattedIntegerPart}.${formattedFractionalPart}`;
	} else {
		return formattedIntegerPart;
	}
};
