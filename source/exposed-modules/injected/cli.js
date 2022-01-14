/* Exposes command-line arguments passed to the currently running TL script, and allows interacting with the user through input and output. */

const ArgumentParser = require('../../ArgumentParser/ArgumentParser');
const ScriptEnvironment = require('../../ScriptEnvironment');
const TypeDefinition = require('../../TypeDefinition');

let cli = module.exports;

cli.args = null;

cli.accept = function(argumentDefinitions) {
	if (cli.args) throw Error(`cli.accept() was called twice`);
	
	const argumentParser = new ArgumentParser(argumentDefinitions); // may throw
	const parsedArguments = argumentParser.parse(ScriptEnvironment.rawArguments); // may exit the program
	const processedArguments = parsedArguments.getProcessedValues(); // may exit the program
	
	cli.args = processedArguments;
};

cli.tell = function(text) {
	console.log(text);
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
