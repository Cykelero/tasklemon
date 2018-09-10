const moment = require('moment');

let format = module.exports = function(value) {
	if (typeof(value) === 'number') {
		return format.number(value);
	} else {
		return format.date(value);
	}
};

format.number = function() {
	return format.number.float.apply(this, arguments);
};

format.number.integer = function(value, unit) {
	return format.number.float(value, unit, 0);
};

format.number.float = function(value, unit, decimalPlaces = 2) {
	let result = '';
	let roundedValue, integerPart, fractionalPart;
	
	decimalPlaces = Math.max(0, Math.round(decimalPlaces));
	
	// Round number
	const roundingOffset = Math.pow(10, decimalPlaces);
	roundedValue = Math.round(value * roundingOffset) / roundingOffset;
	
	// Separate components
	[, integerPart, , fractionalPart] = /(\d+)(\.(\d+))?/.exec(roundedValue);
	
	// Add minus sign
	if (value < 0) result += '-';

	// Build comma-separated integer part
	integerPartWithCommas = integerPart.replace(/(?<!^)(?=(.{3})+$)/g, ',');
	
	result += integerPartWithCommas;
	
	// Pad and truncate fractional part
	if (decimalPlaces > 0) {
		result += '.';
		result += (fractionalPart || '').substr(0, decimalPlaces).padEnd(decimalPlaces, '0');
	}
	
	// Add and pluralize unit
	if (unit) {
		if (!Array.isArray(unit)) unit = [unit, unit + 's'];
		const isPlural =  value === 0 || Math.abs(value) > 1;
		
		result += ' ' + (isPlural ? unit[1] : unit[0]);
	}
	
	// Return
	return result;
};

format.date = function() {
	return format.date.short.apply(this, arguments);
};

format.date.short = function(value, noTime) {
	let format = 'YY-MM-DD';
	if (!noTime) format += ' HH:mm:ss';
	return moment(value).format(format);
};

format.date.long = function(value, noTime) {
	let format = 'dddd, MMMM Do, YYYY';
	if (!noTime) format += ', HH:mm:ss';
	return moment(value).format(format);
};

format.date.relative = function(value) {
	return moment(value).fromNow();
};

format.duration = function() {
	return format.duration.between.apply(this, arguments);
};

format.duration.between = function(value1, value2) {
	return moment(value1).to(value2, true);
};
