const moment = require('moment');

const symbol = Symbol('tasklemon type definition');
module.exports = { symbol };

// Built-in type definitions
Boolean[symbol] = function(value) {
	switch (value) {
		case 'yes':
		case 'y':
		case 'true':
		case 't':
		case '1':
		case 'yeah':
		case 'yep':
		case 'yup':
		case 'sure':
			return true;
		case 'no':
		case 'n':
		case 'false':
		case 'f':
		case '0':
		case 'nope':
		case 'nah':
		case 'nay':
			return false;
		default:
			throw 'is not a boolean';
	}
};

Number[symbol] = function(value) {
	const castValue = Number(value);
	if (isNaN(value)) throw 'is not a valid number';
	return castValue;
};

Object[symbol] = function(value) {
	try {
		return JSON.parse(value);
	} catch (e) {
		throw 'is not valid JSON';
	}
};

Array[symbol] = function(value) {
	const castValue = [];
	
	let currentIndex = 0;
	while (currentIndex < value.length) {
		// Skip spaces
		while (value[currentIndex] === ' ') currentIndex++;
		
		// New piece
		const startCharacter = value[currentIndex++];
		const isQuoteDelimited = (startCharacter === '\'' || startCharacter === '"');
		const endCharacter = isQuoteDelimited ? startCharacter : ' ';
		
		let pieceString = '';
		
		if (!isQuoteDelimited) pieceString += startCharacter;
		
		while (currentIndex < value.length) {
			const currentCharacter = value[currentIndex++];
			if (currentCharacter === '\\') {
				// Next character is escaped
				pieceString += value[currentIndex++];
			} else if (currentCharacter === endCharacter) {
				break;
			} else {
				pieceString += currentCharacter;
			}
		}
		
		castValue.push(pieceString);

		// Skip spaces
		while (value[currentIndex] === ' ') currentIndex++;
	}
	
	return castValue;
};

moment[symbol] = function(value) {
	const trimmedValue = value.trim();
	let castValue = moment(value, moment.ISO_8601);

	// Try adding a century
	if (!castValue.isValid() && trimmedValue.length >= 6) {
		if (/^\d\d/.exec(trimmedValue)) {
			const century = Number(trimmedValue.slice(0, 2)) > 68 ? '19' : '20';
			castValue = moment(century + trimmedValue, moment.ISO_8601);
		}
	}
	
	if (!castValue.isValid()) throw 'is not a valid date';
	
	return castValue;
};

Date[symbol] = function(value) {
	return moment[symbol](value).toDate();
};

RegExp[symbol] = function(value) {
	try {
		return new RegExp(value);
	} catch (error) {
		const truncatedMessage = / ?([^:]*)$/.exec(error.message)[1];
		throw 'is not a valid regular expression: ' + truncatedMessage;
	}
};
