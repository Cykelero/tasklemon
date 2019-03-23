#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');

const crossSpawn = require('cross-spawn');
const rimraf = require('rimraf');

const ScriptParser = require('./ScriptParser');
const PackageCache = require('./PackageCache');

function parseProgramArguments(argumentList) {
	const rawArguments = argumentList.slice(2); // skip node and tasklemon
	const scriptPathIndex = rawArguments.findIndex(arg => (arg[0] !== '-'));
	const scriptPath = rawArguments[scriptPathIndex];
	
	return {
		scriptPath,
		scriptName: path.basename(scriptPath),
		lemonArguments: rawArguments.slice(0, scriptPathIndex),
		scriptArguments: rawArguments.slice(scriptPathIndex + 1)
	};
}

function parseNodeArguments(lemonArguments) {
	const validNodeArguments = ['--inspect', '--inspect-brk'];
	return lemonArguments.filter(arg => validNodeArguments.includes(arg));
}

function readScriptSource(scriptPath) {
	try {
		return fs.readFileSync(scriptPath, {encoding: 'utf8'});
	} catch (error) {
		const scriptName = path.basename(scriptPath);
		const parsedError = parseNodeError(error);
		process.stdout.write(`Couldn't read “${scriptName}” because of error: “${parsedError}”. \n`);
		process.exit(1);
	}
}

function parseNodeError(error) {
	const errorParts = /Error: (.+), /.exec(error.toString());
	return errorParts ? errorParts[1] : error.code;
}

// Run
const programArgs = parseProgramArguments(process.argv);
const nodeArgs = parseNodeArguments(programArgs.lemonArguments);
const scriptSource = readScriptSource(programArgs.scriptPath);

if (nodeArgs.length > 0) {
	// Run as separate process
	const tasklemonPath = __filename;
	
	const inspectableProcess = crossSpawn(
		'node',
		[...nodeArgs, tasklemonPath, programArgs.scriptPath, ...programArgs.scriptArguments],
		{ stdio: 'inherit' }
	);

	inspectableProcess.on('exit', code => {
		process.exit(code);
	});
} else {
	// Execute in place
	const parser = new ScriptParser(scriptSource);

	let stagePath;
	let preparedScriptPath;
	
	// // Preload packages asynchronously
	PackageCache.preloadPackageBundle(parser.requiredPackages);
	
	// // Write script to stage
	stagePath = fs.mkdtempSync(os.tmpdir() + path.sep);
	preparedScriptPath = path.join(stagePath, programArgs.scriptName);
	fs.writeFileSync(preparedScriptPath, parser.preparedSource);

	// // Execute script
	require('./injected-modules/cli')._rawArguments = programArgs.scriptArguments;
	require(preparedScriptPath);

	// // Delete stage once script has run
	process.on('exit', () => {
		rimraf.sync(stagePath);
	});
}
