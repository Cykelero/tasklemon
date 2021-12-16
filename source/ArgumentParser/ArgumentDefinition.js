/* Represents an accepted argument. Knows its name, type, identifiers, etc. */

const OmitBehavior = require('./OmitBehavior');
const required = require('../exposed-modules/injected/required');

module.exports = class ArgumentDefinition {
	constructor(name, rawDefinition) {
		this.name = name;
		this.identifiers = null;
		this.type = String;
		this.omitBehavior = new OmitBehavior('none');
		this.description = null;
		
		// Init
		let identifiersString;
		
		// // Split parameters
		if (typeof rawDefinition === 'string') {
			// Argument definition is just an identifier string
			identifiersString = rawDefinition;
		} else {
			// Argument definition is an array of parameters
			let omitBehaviorOrDescription, maybeDescription;
			
			[
				identifiersString,
				this.type,
				omitBehaviorOrDescription,
				maybeDescription
			] = rawDefinition;
			
			if (omitBehaviorOrDescription instanceof OmitBehavior) {
				this.omitBehavior = omitBehaviorOrDescription;
				this.description = maybeDescription;
			} else {
				this.description = omitBehaviorOrDescription;
			}
		}
		
		// // Parse identifiers
		this.identifiers = identifiersString
			.split(' ')
			.map(identifier => identifier.trim())
			.filter(identifier => identifier.length > 0);
		
		// // Set default description
		if (this.description === null) this.description = `Also called “${name}”`;
		
		// // Check for errors
		this.checkForErrors();
	}
	
	checkForErrors() {
		const throwWithReason = reason => {
			throw Error(`Syntax for \`${this.name}\` is invalid: ${reason}`);
		}
		
		// Check for forgotten parentheses for omit behavior
		if (this.description === required) {
			throw Error(`Argument definition error: in \`${this.name}\` definition, \`required\` must be called as a function`);
		}
		
		// Check identifiers and related requirements
		this.identifiers.forEach(identifier => {
			if (identifier.slice(0, 2) === '--') {
				// Longhand argument
				if (identifier.length === 2) {
					throwWithReason('`--` is not a valid identifier');
				}
			} else if (identifier[0] === '-') {
				// Shorthand argument
				if (identifier.length > 2) {
					throwWithReason('shorthand names must be a single character');
				}
			} else if (identifier === '#+') {
				// Rest argument
				if (this.identifiers.length > 1) {
					throwWithReason('“#+” cannot have alternatives');
				}
				
				if (this.omitBehavior.type === 'required') {
					throw Error(`Argument definition error: rest argument \`${this.name}\` cannot be set as required`);
				} else if (this.omitBehavior.type === 'defaultsTo') {
					throw Error(`Argument definition error: rest argument \`${this.name}\` cannot have a default value`);
				}
			} else if (identifier[0] === '#') {
				// Positional argument
			} else {
				// Neither of these: invalid
				throwWithReason(`expected “#” or “-”, found “${identifier[0]}”`);
			}
		});
		
		// Multiple positional identifiers?
		const positionalIdentifiers = this.identifiers.filter(
			identifier => ArgumentDefinition.isPositionalIdentifier(identifier)
		);
		
		if (positionalIdentifiers.length > 1) {
			throwWithReason(`cannot have more than one positional identifier`);
		}
	}
	
	matchesIdentifierString(identifierString) {
		return this.identifiers.includes(identifierString);
	}
	
	get hasNameIdentifier() {
		return this.identifiers.some(
			identifier => ArgumentDefinition.isNameIdentifier(identifier)
		);
	}
	
	get hasPositionalIdentifier() {
		return this.identifiers.some(
			identifier => ArgumentDefinition.isPositionalIdentifier(identifier)
		);
	}
	
	get hasRestIdentifier() {
		return this.identifiers.some(
			identifier => ArgumentDefinition.isRestIdentifier(identifier)
		);
	}
	
	get position() {
		const positionalIdentifier = this.identifiers.find(
			identifier => ArgumentDefinition.isPositionalIdentifier(identifier)
		);
		
		if (!positionalIdentifier) return null;
		
		return ArgumentDefinition.positionForPositionalIdentifier(positionalIdentifier);
	}
	
	get nicestIdentifier() {
		return this.identifiers.find(identifier => identifier.slice(0, 2) === '--')
			|| this.identifiers.find(identifier => identifier[0] === '-')
			|| this.identifiers[0];
	}
	
	static isNameIdentifier(identifier) {
		return /^--?.+$/.test(identifier);
	}
	
	static isPositionalIdentifier(identifier) {
		return this.positionForPositionalIdentifier(identifier) !== null;
	}
	
	static isRestIdentifier(identifier) {
		return identifier === '#+';
	}
	
	static positionForPositionalIdentifier(identifier) {
		const parts = /^#(\d)$/.exec(identifier);
		if (!parts) return null;
		
		return Number(parts[1]);
	}
}
