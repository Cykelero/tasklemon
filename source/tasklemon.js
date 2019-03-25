#!/usr/bin/env node

const ScriptRunner = require('./ScriptRunner');
const Tools = require('./Tools');

const validLemonArguments = [];
const validNodeArguments = ['--inspect', '--inspect-brk'];

function parseProgramArguments(argumentList) {
	const rawArguments = argumentList.slice(2); // skip node and tasklemon
	const scriptPathIndex = rawArguments.findIndex(arg => (arg[0] !== '-'));
	
	const ourArguments = rawArguments.slice(0, scriptPathIndex);
	
	exitIfContainsInvalidArguments(ourArguments);
	
	const lemonArguments = ourArguments.filter(arg => validLemonArguments.includes(arg));
	const nodeArguments = ourArguments.filter(arg => validNodeArguments.includes(arg));
	
	return {
		scriptPath: rawArguments[scriptPathIndex],
		lemonArguments,
		nodeArguments,
		scriptArguments: rawArguments.slice(scriptPathIndex + 1)
	};
}

function exitIfContainsInvalidArguments(args) {
	const invalidArguments = args.filter(arg =>
		!validLemonArguments.includes(arg)
		&& !validNodeArguments.includes(arg)
	);
	
	
	if (invalidArguments.length > 0) {
		let message;
		
		const s = invalidArguments.length > 1 ? 's' : '';
		message = `Argument error: invalid Tasklemon argument${s}: `;
		
		invalidArguments.forEach((invalidArg, index) => {
			message += (index === 0 ? '' : ', ') + `“${invalidArg}”`;
		});
	
		Tools.exitWithError(message);
	}
}

// Run
const programArgs = parseProgramArguments(process.argv);

if (programArgs.nodeArguments.length === 0) {
	// Execute in place
	ScriptRunner.run(programArgs.scriptPath, programArgs.scriptArguments);
} else {
	// Run as separate process
	ScriptRunner.runInNewProcess(
		programArgs.scriptPath,
		programArgs.scriptArguments,
		programArgs.nodeArguments
	);
}
