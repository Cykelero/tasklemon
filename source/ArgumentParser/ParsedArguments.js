/* Represents user arguments that have been evaluated against a script's argument definitions. */

const ArgumentDefinition = require('./ArgumentDefinition');
const TypeDefinition = require('../TypeDefinition');
const Tools = require('../Tools');

module.exports = class ParsedArguments {
	constructor(argumentParser) {
		this.argumentParser = argumentParser;
		this.arguments = [];
	}
	
	addPositionalValue(value) {
		const nextPosition = this.positionalArguments.length;
		const positionalIdentity = '#' + nextPosition;
		
		this.addIdentifiedValue(positionalIdentity, value);
	}
	
	addIdentifiedValue(identifier, value) {
		// Has the argument already been specified?
		const definition = this.argumentParser.getDefinitionFor(identifier);
		
		if (definition) {
			const existingArgument = this.arguments.find(
				arg => definition.matchesIdentifierString(arg.usedIdentifier)
			);
			
			if (existingArgument) {
				Tools.exitWithError(`Argument error: “${identifier}” already specified as “${existingArgument.usedIdentifier}”`);
			}
		}
		
		// Add
		this.arguments.push({
			usedIdentifier: identifier,
			value
		});
	}
	
	get positionalArguments() {
		return this.arguments.filter(
			argument => ArgumentDefinition.isPositionalIdentifier(argument.usedIdentifier)
		);
	}
	
	getProcessedValues() {
		const result = {};
		const missingRequiredDefinitions = [];
		
		function castForDefinition(definition, argument) {
			const castResult = TypeDefinition.execute(definition.type, argument.value);
			
			if (!castResult.valid) {
				Tools.exitWithError(`Argument error: “${argument.value}” ${castResult.errorText}`);
			}
			
			return castResult.value;
		}
		
		// Resolve most definitions
		for (let definition of this.argumentParser.definitions) {
			let resolvedValue;
			
			const matchingArgumentIndex = this.arguments.findIndex(
				argument => definition.matchesIdentifierString(argument.usedIdentifier)
			);
			
			// // Set implicit default value
			if (definition.type === Boolean) {
				resolvedValue = false;
			} else {
				resolvedValue = null;
			}
			
			// Resolve value
			if (matchingArgumentIndex === -1) {
				// No matching argument
				const omitBehavior = definition.omitBehavior;
				
				if (omitBehavior.type === 'required') {
					missingRequiredDefinitions.push(definition);
				} else if (omitBehavior.type === 'defaultsTo') {
					resolvedValue = omitBehavior.args.defaultValue;
				}
			} else {
				// Matching argument found
				const castValue = castForDefinition(definition, this.arguments[matchingArgumentIndex]);
				
				resolvedValue = castValue;
			}
			
			// Set
			result[definition.name] = resolvedValue;
		}
		
		// Resolve rest definition
		const restDefinition = this.argumentParser.restDefinition;
		const unusedArguments = this.arguments.filter(arg =>
			!this.argumentParser.getDefinitionFor(arg.usedIdentifier)
		);
		
		if (unusedArguments.length > 0) {
			const castUnusedArguments = unusedArguments.map(
				arg => castForDefinition(restDefinition, arg)
			);
			
			result[restDefinition.name] = castUnusedArguments;
		} else if (restDefinition.omitBehavior.type === 'defaultsTo') {
			result[restDefinition.name] = restDefinition.omitBehavior.args.defaultValue;
		} else {
			result[restDefinition.name] = [];
		}
		
		// Fail if required arguments are missing
		const namedMissingRequiredDefinitions = missingRequiredDefinitions
			.filter(definition => definition.hasNameIdentifier);
		
		if (namedMissingRequiredDefinitions.length > 0) {
			// Named definitions are missing
			const nameStrings = namedMissingRequiredDefinitions
				.map(definition => definition.nicestIdentifier)
				.map(niceIdentifier => `“${niceIdentifier}”`);
			const namesString = formatList(nameStrings);
			const are = namedMissingRequiredDefinitions.length > 1 ? 'are' : 'is';
			
			Tools.exitWithError(`Argument error: ${namesString} ${are} required`);
		} else if (missingRequiredDefinitions.length > 0) {
			// Positional definitions (only) are missing
			const requiredPositionalArgumentCount =
				this.argumentParser.requiredPositionalDefinitionCount
				+ (this.argumentParser.restDefinitionIsRequired ? 1 : 0);
			
			const s = requiredPositionalArgumentCount > 1 ? 's' : '';
			const atLeast = this.argumentParser.restDefinitionIsRequired ? ' at least' : '';
			
			const providedPositionalArgumentCount = this.arguments.filter(
				arg => ArgumentDefinition.isPositionalIdentifier(arg.usedIdentifier)
			).length;
			
			Tools.exitWithError(`Argument error: expected${atLeast} ${requiredPositionalArgumentCount} positional argument${s}, got ${providedPositionalArgumentCount} instead`);
		}
		
		return result;
	}
}

function formatList(strings) {
	const lastTwoString = strings.slice(-2).join(' and ');
	return [...strings.slice(0, -2), lastTwoString].join(', ');
}
