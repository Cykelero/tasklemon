/* Represents a set of accepted arguments, and allows parsing user arguments against them. */

const ArgumentDefinition = require('./ArgumentDefinition');
const ParsedArguments = require('./ParsedArguments');
const Tools = require('../Tools');

module.exports = class ArgumentParser {
	constructor(rawDefinitions) {
		this.definitions = Object.entries(rawDefinitions)
			.map(([name, rawDefinition]) => new ArgumentDefinition(name, rawDefinition));
		
		// Init
		const explicitRestDefinition = this.definitions.find(definition => definition.hasRestIdentifier);
		
		if (!explicitRestDefinition) {
			this.definitions.push(new ArgumentDefinition('rest', '#+'));
		}
		
		// // Check for errors
		this.checkForErrors();
	}
	
	checkForErrors() {
		// Redundant usage of a name
		const definitionForIdentifier = {};
		
		for (let definition of this.definitions) {
			for (let identifier of definition.identifiers) {
				if (identifier in definitionForIdentifier) {
					const priorArgumentName = definitionForIdentifier[identifier].name;
					throw Error(`Syntax for \`${definition.name}\` is invalid: “${identifier}” is already used for \`${priorArgumentName}\``);
				}
				
				definitionForIdentifier[identifier] = definition;
			}
		}
		
		// Non-contiguous required positional arguments
		const firstOptionalPositionalDefinitionIndex = this.orderedPositionalDefinitions.findIndex(
			definition => definition.omitBehavior.type !== 'required'
		);
		
		if (firstOptionalPositionalDefinitionIndex !== -1) {
			const firstSubsequentRequiredDefinition = this.orderedPositionalDefinitions
				.slice(firstOptionalPositionalDefinitionIndex + 1)
				.filter(definition => !definition.hasNameIdentifier)
				.find(definition => definition.omitBehavior.type === 'required');
			
			if (firstSubsequentRequiredDefinition) {
				throw Error(`Argument definition error: positional argument \`${firstSubsequentRequiredDefinition.name}\` is required, but the preceding arguments are not`);
			}
		}
	}
	
	// Get definitions
	getDefinitionFor(identifier, exitIfUnknown) {
		const definition = this.definitions.find(definition => definition.matchesIdentifierString(identifier));
		
		if (!definition && exitIfUnknown) {
			Tools.exitWithError(`Argument error: “${identifier}” unexpected`);
		}
		
		return definition || null;
	}
	
	get orderedPositionalDefinitions() {
		return this.definitions
			.filter(definition => definition.hasPositionalIdentifier)
			.sort((a, b) => a.position - b.position);
	}
	
	get restDefinition() {
		const definition = this.definitions.find(definition => definition.hasRestIdentifier);
		
		return definition || null;
	}
	
	get requiredPositionalDefinitionCount() {
		const requiredPositionalOnlyDefinitions = this.orderedPositionalDefinitions
			.filter(definition => definition.omitBehavior.type === 'required')
			.filter(definition => !definition.hasNameIdentifier);
		
		const last = requiredPositionalOnlyDefinitions[requiredPositionalOnlyDefinitions.length - 1];
		
		return last ? last.position + 1 : 0;
	}
	
	// Parse arguments
	parse(rawArguments) {
		const result = new ParsedArguments(this);
		
		// Read arguments
		let didEncounterDelimiter = false;
		let expectValueFor = null;
		
		for (let rawArgument of rawArguments) {
			// Did we pass a delimiter?
			if (didEncounterDelimiter) {
				result.addPositionalValue(rawArgument);
				continue;
			}
			
			// Are we expecting a value?
			if (expectValueFor !== null) {
				result.addIdentifiedValue(expectValueFor, rawArgument);
				expectValueFor = null;
				continue;
			}
			
			// Delimiter
			if (rawArgument === '--') {
				didEncounterDelimiter = true;
				continue;
			}
			
			// Longhand argument
			if (rawArgument.slice(0, 2) === '--') {
				// Named argument
				const definition = this.getDefinitionFor(rawArgument, true);
				
				if (definition.type === Boolean) {
					result.addIdentifiedValue(rawArgument, 'true');
				} else {
					expectValueFor = rawArgument;
				}
				continue;
			}
			
			// Shorthand argument
			if (rawArgument[0] === '-' && rawArgument.length > 1) {
				// Shorthand argument (or shorthand argument group)
				const shorthandArgumentLetters = rawArgument.slice(1).split('');
				
				shorthandArgumentLetters.forEach((shorthandArgumentLetter, index) => {
					const expandedIdentifier = '-' + shorthandArgumentLetter;
					const definition = this.getDefinitionFor(expandedIdentifier, true);
					
					if (definition.type === Boolean) {
						result.addIdentifiedValue(expandedIdentifier, 'true');
					} else {
						const isLastLetter = index === (shorthandArgumentLetters.length - 1);
						if (isLastLetter) {
							expectValueFor = expandedIdentifier;
						} else {
							// Argument needs a value, but is not in last place
							Tools.exitWithError(`Argument error: “${expandedIdentifier}” requires a value, and so must be at the end of the group`);
						}
					}
				});
				continue;
			}
			
			// Didn't match anything else: positional argument
			result.addPositionalValue(rawArgument);
		}
		
		// Fail if the last argument still needed a value
		if (expectValueFor !== null) {
			// Last argument didn't get its value
			Tools.exitWithError(`Argument error: “${expectValueFor}” requires a value, but got none`);
		}
		
		return result;
	}
}
