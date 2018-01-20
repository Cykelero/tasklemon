const TypeDefinition = require('../TypeDefinition');

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
