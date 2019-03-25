#!/usr/bin/env node

const ScriptRunner = require('./ScriptRunner');

const validLemonArguments = [];
const validNodeArguments = ['--inspect', '--inspect-brk'];

function parseProgramArguments(argumentList) {
	const rawArguments = argumentList.slice(2); // skip node and tasklemon
	const scriptPathIndex = rawArguments.findIndex(arg => (arg[0] !== '-'));
	
	const ourArguments = rawArguments.slice(0, scriptPathIndex);
	
	const lemonArguments = ourArguments.filter(arg => validLemonArguments.includes(arg));
	const nodeArguments = ourArguments.filter(arg => validNodeArguments.includes(arg));
	
	return {
		scriptPath: rawArguments[scriptPathIndex],
		lemonArguments,
		nodeArguments,
		scriptArguments: rawArguments.slice(scriptPathIndex + 1)
	};
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
