/* Exposes command-line arguments passed to the currently running TL script, and allows interacting with the user through input and output. */

const ScriptEnvironment = require('../../ScriptEnvironment');
const TypeDefinition = require('../../TypeDefinition');
const Tools = require('../../Tools');

let cli = module.exports;

cli.args = null;

cli.accept = function(argumentDefinitions) {
	if (cli.args) throw Error(`cli.accept() was called twice`);
	
	const parsedArgumentDefinitions = parseArgumentDefinitions(argumentDefinitions);
	checkArgumentDefinitionSyntax(parsedArgumentDefinitions);
	cli.args = applyArgumentDefinitions(parsedArgumentDefinitions, ScriptEnvironment.rawArguments);
};

cli.tell = function(text) {
	process.stdout.write(text + '\n');
};

cli.ask = function(promptText, type, skippable) {
	const readlineInterface = require('readline').createInterface({input: process.stdin, output: process.stdout});
	
	return new Promise(function (resolve) {
		readlineInterface.question(`${promptText} `, function(answer) {
			readlineInterface.close();
			
			if (answer === '') {
				// No answer
				if (!skippable) {
					cli.tell(`Please enter a value.`);
					resolve(cli.ask(promptText, type, skippable));
				} else {
					resolve(null);
				}
			} else {
				// Execute type definitions
				const castResult = TypeDefinition.execute(type, answer);
				
				if (castResult.valid) {
					resolve(castResult.value);
				} else {
					cli.tell(`Value ${castResult.errorText}.`);
					resolve(cli.ask(promptText, type, skippable));
				}
			}
		});
	});
};

cli.askMany = async function(askArguments) {
	let result = {};
	
	for (let askKey of Object.keys(askArguments)) {
		result[askKey] = await cli.ask.apply(cli, askArguments[askKey]);
	}
	
	return result;
};

cli.tellWhile = async function(promptText, awaitable) {
	process.stdout.write(promptText);
	
	const awaitableResult = await awaitable;
	
	process.stdout.cursorTo(0);
	for (let i = 0; i < promptText.length; i++) {
		process.stdout.write(' ');
	}
	process.stdout.cursorTo(0);
	
	return awaitableResult;
};

function parseArgumentDefinitions(argumentDefinitions) {
	return Object.entries(argumentDefinitions)
		.map(([name, definition]) => {
			let syntax, type, description;
			
			if (typeof definition === 'string') {
				syntax = definition;
			} else {
				[syntax, type, description] = definition;
			}
			
			if (!type) type = String;
			if (!description) description = `Also called “${name}”`;
			
			const alternatives = syntax
				.split(' ')
				.map(alternative => alternative.trim())
				.filter(alternative => alternative.length > 0);
			
			return {name, alternatives, type, description};
		});	
}

function checkArgumentDefinitionSyntax(argumentDefinitions) {
	let firstOccurrences = {};
	
	argumentDefinitions.forEach(argumentDefinition => {
		function throwForThisDefinition(reason) {
			throw Error(`Syntax for \`${argumentDefinition.name}\` is invalid: ${reason}`);
		}
		
		argumentDefinition.alternatives.forEach(alternative => {
			// Check for redundant usage of a name
			const priorUsageName = firstOccurrences[alternative];
			if (priorUsageName) {
				throwForThisDefinition(`“${alternative}” is already used for \`${priorUsageName}\``);
			}
			
			firstOccurrences[alternative] = argumentDefinition.name;
			
			// Check for syntax-specific errors
			const firstCharacter = alternative[0];
			
			if (alternative.slice(0, 2) === '--') {
				// Named argument: everything goes
			} else if (firstCharacter === '-') {
				// Shorthand argument
				if (alternative.length > 2) {
					throwForThisDefinition('shorthand names must be a single character');
				}
			} else if (alternative === '#+') {
				// Rest argument
				if (argumentDefinition.alternatives.length > 1) {
					throwForThisDefinition('“#+” cannot have alternatives');
				}
			} else if (firstCharacter === '#') {
				// Positional argument
				const positionalAlternatives = argumentDefinition.alternatives.filter(alternative => /#\d/.test(alternative));
				
				if (positionalAlternatives.length > 1) {
					throwForThisDefinition(`cannot have more than one positional identifier`);
				}
			} else {
				// Neither of these: invalid
				throwForThisDefinition(`expected “#” or “-”, found “${firstCharacter}”`);
			}
		});
	});
}

function applyArgumentDefinitions(argumentDefinitions, rawArguments) {
	let result = {};
	
	function definitionFor(userString, failIfAbsent) {
		const argumentDefinition = argumentDefinitions.find(ad => ad.alternatives.some(a => a === userString));
			
		if (failIfAbsent && !argumentDefinition) {
			Tools.exitWithError(`Argument error: “${userString}” unexpected`);
		}
		
		return argumentDefinition;
	}
	
	function castForDefinition({type}, value) {
		const castResult = TypeDefinition.execute(type, value);
		
		if (!castResult.valid) {
			Tools.exitWithError(`Argument error: “${value}” ${castResult.errorText}`);
		}
		
		return castResult.value;
	}
	
	// Prepare result map
	// // Default null values
	argumentDefinitions.forEach(argumentDefinition => {
		result[argumentDefinition.name] = (argumentDefinition.type === Boolean) ? false : null;
	});
	
	// // Rest values
	const restDefinition = definitionFor('#+', false);
	if (restDefinition) {
		result[restDefinition.name] = [];
	} else {
		result.rest = [];
	}
	
	// Read arguments
	let firstOccurrences = {};
	let nextPositionalIndex = 0;
	let expectValueFor = null;
	let didEncounterDelimiter = false;

	function rememberOccurrence({name: argumentName}, userString) {
		const priorUsageString = firstOccurrences[argumentName];
		if (priorUsageString) {
			Tools.exitWithError(`Argument error: “${userString}” already specified as “${priorUsageString}”`);
		}
		
		firstOccurrences[argumentName] = userString;
	}
	
	rawArguments.forEach(rawArgument => {
		// Consume argument as value?
		if (expectValueFor) {
			const castValue = castForDefinition(expectValueFor, rawArgument);
			result[expectValueFor.name] = castValue;
			
			expectValueFor = null;
			return;
		}
		
		// Did we pass a delimiter?
		if (!didEncounterDelimiter) {
			if (rawArgument === '--') {
				didEncounterDelimiter = true;
				return;
			}
			
			if (rawArgument.slice(0, 2) === '--') {
				// Named argument
				const argumentDefinition = definitionFor(rawArgument, true);
				rememberOccurrence(argumentDefinition, rawArgument);
				
				if (argumentDefinition.type === Boolean) {
					result[argumentDefinition.name] = true;
				} else {
					expectValueFor = argumentDefinition;
				}
				return;
			}
			
			if (rawArgument[0] === '-' && rawArgument.length > 1) {
				// Shorthand argument (or shorthand argument group)
				const shorthandArgumentLetters = rawArgument.slice(1).split('');
				
				shorthandArgumentLetters.forEach((shorthandArgumentLetter, index) => {
					const isLastLetter = (index + 1) === shorthandArgumentLetters.length;
					const expandedArgument = '-' + shorthandArgumentLetter;
					const argumentDefinition = definitionFor(expandedArgument, true);
					
					if (argumentDefinition.type !== Boolean && !isLastLetter) {
						// Argument needs a value, but is not in last place
						Tools.exitWithError(`Argument error: “${expandedArgument}” requires a value`);
					}
					
					rememberOccurrence(argumentDefinition, expandedArgument);
					
					if (argumentDefinition.type === Boolean) {
						result[argumentDefinition.name] = true;
					} else {
						expectValueFor = argumentDefinition;
					}
				});
				return;
			}
		}
		
		// Didn't match anything else: positional argument
		const positionalIdentity = '#' + nextPositionalIndex;
		
		const argumentDefinition = definitionFor(positionalIdentity, false);
		if (argumentDefinition) {
			// Indexed
			rememberOccurrence(argumentDefinition, positionalIdentity);
			const castValue = castForDefinition(argumentDefinition, rawArgument);
			result[argumentDefinition.name] = castValue;
		} else if (restDefinition) {
			// Catch-all
			const castValue = castForDefinition(restDefinition, rawArgument);
			result[restDefinition.name].push(castValue);
		} else {
			// Rest
			result.rest.push(rawArgument);
		}
		
		nextPositionalIndex++;
	});
	
	if (expectValueFor !== null) {
		// Last argument didn't get its value
		const userString = firstOccurrences[expectValueFor.name];
		Tools.exitWithError(`Argument error: “${userString}” requires a value`);
	}
	
	return result;
}
