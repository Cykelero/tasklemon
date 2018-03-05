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
