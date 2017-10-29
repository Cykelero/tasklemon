const moment = require('moment');

let cli = module.exports;

cli.tell = function(text) {
	process.stdout.write(text + '\n');
};

cli.ask = function(promptText, type, skippable) {
	const interface = require('readline').createInterface({input: process.stdin, output: process.stdout});
	
	return new Promise(function(resolve, reject) {
		interface.question(`${promptText} `, function(answer) {
			interface.close();
			
			if (answer === '') {
				// No answer
				if (!skippable) {
					cli.tell(`Please enter a value.`);
					resolve(cli.ask(promptText, type, skippable));
				} else {
					resolve(null);
				}
			} else if (!type) {
				// Return answer as-is
				resolve(answer);
			} else {
				// Execute type definitions
				const typeDefinitionList = Array.isArray(type) ? type : [type];
				
				Promise.resolve()
					.then(async function() {
						let currentValue = answer;
						for (typeDefinition of typeDefinitionList) {
							typeDefinition = typeDefinition[cli.typeDefinitionSymbol] || typeDefinition;
							currentValue = await typeDefinition(currentValue);
						}
						resolve(currentValue);
					})
					.catch(function(errorText) {
						cli.tell(`Value ${errorText}.`);
						resolve(cli.ask(promptText, type, skippable));
					});
			}
		});
	});
};

cli.askMany = async function(askArguments) {
	let result = {};
	
	const askKeys = Object.keys(askArguments);
	for (let askKey of askKeys) {
		result[askKey] = await cli.ask.apply(cli, askArguments[askKey]);
	};
	
	return result;
};

cli.tellWhile = async function(promptText, awaitable) {
	process.stdout.write(promptText);
	
	const awaitableResult = await awaitable;
	
	process.stdout.cursorTo(0);
	for (var i = 0; i < promptText.length; i++) {
		process.stdout.write(' ');
	}
	process.stdout.cursorTo(0);
	
	return awaitableResult;
};

cli.typeDefinitionSymbol = Symbol('tasklemon type definition');

// Setup type definitions
Boolean[cli.typeDefinitionSymbol] = function(value) {
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

Number[cli.typeDefinitionSymbol] = function(value) {
	const castValue = Number(value);
	if (isNaN(value)) throw 'is not a valid number';
	return castValue;
};

Object[cli.typeDefinitionSymbol] = function(value) {
	try {
		return JSON.parse(value);
	} catch (e) {
		throw 'is not valid JSON';
	}
};

Array[cli.typeDefinitionSymbol] = function(value) {
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

moment[cli.typeDefinitionSymbol] = function(value) {
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

Date[cli.typeDefinitionSymbol] = function(value) {
	return moment[cli.typeDefinitionSymbol](value).toDate();
};

RegExp[cli.typeDefinitionSymbol] = function(value) {
	try {
		return new RegExp(value);
	} catch (error) {
		const truncatedMessage = / ?([^:]*)$/.exec(error.message)[1];
		throw 'is not a valid regular expression: ' + truncatedMessage;
	}
};
