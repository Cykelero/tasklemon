let format = module.exports;

format.number = function(value, decimalPlaces = 2) {
	const [, integerPart, , fractionalPart] = /(\d+)(\.(\d+))?/.exec(value);

	let formattedIntegerPart = '';
	let formattedFractionalPart = '';

	// Build comma-separated integer part
	let currentIndex = integerPart.length - 3;
	
	while (currentIndex >= 0) {
		// Add 3-digit group
		if (formattedIntegerPart.length) formattedIntegerPart = ',' + formattedIntegerPart;
		formattedIntegerPart = integerPart.substr(currentIndex, 3) + formattedIntegerPart;
		currentIndex -= 3;
	}
	
	if (currentIndex > -3) {
		// Add last digit group
		if (formattedIntegerPart.length) formattedIntegerPart = ',' + formattedIntegerPart;
		formattedIntegerPart = integerPart.substr(0, currentIndex + 3) + formattedIntegerPart;
	}
	
	// Pad and truncate fractional part
	if (decimalPlaces > 0) {
		formattedFractionalPart = (fractionalPart || '').substr(0, decimalPlaces);
		while (formattedFractionalPart.length < decimalPlaces) formattedFractionalPart += '0';
	}
	
	// Return
	if (decimalPlaces > 0) {
		return `${formattedIntegerPart}.${formattedFractionalPart}`;
	} else {
		return formattedIntegerPart;
	}
};
