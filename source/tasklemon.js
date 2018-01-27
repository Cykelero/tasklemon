#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const childProcess = require('child_process');

const moduleInjectorPath = path.join(__dirname, 'injected-modules', 'injector');

let lemonArguments;
let scriptArguments;

const workingDirectory = process.cwd();
let scriptPath;
let scriptName;

let sourceScriptContent;
let preparedScriptPath;

// Parse arguments
// // Lemon arguments
lemonArguments = [];
let currentArgumentIndex = 2; // skip node path and tasklemon path
let currentArgument;
while (currentArgument = process.argv[currentArgumentIndex]) {
	if (!currentArgument) break;
	if (currentArgument[0] !== '-') break;

	lemonArguments.push(currentArgument);
	currentArgumentIndex++;
}

// // Script path
scriptPath = process.argv[currentArgumentIndex];
scriptName = path.basename(scriptPath);

currentArgumentIndex++;

// // Script arguments
scriptArguments = process.argv.slice(currentArgumentIndex);

// Prepare execution stage
// // Read script
try {
	sourceScriptContent = fs.readFileSync(scriptPath);
} catch (error) {
	const errorParts = /Error: (.+), /.exec(error.toString());
	const formattedErrorDetails = errorParts ? errorParts[1] : error.code;
	process.stdout.write(`Couldn't load “${scriptName}” because of error: “${formattedErrorDetails}”. \n`);
	process.exit(1);
}

const scriptShebangParts = /^#!.+\n/.exec(sourceScriptContent);
if (scriptShebangParts) {
	sourceScriptContent = sourceScriptContent.slice(scriptShebangParts[0].length);
}

// // Create stage folder
const stagePath = fs.mkdtempSync(os.tmpdir() + path.sep);
preparedScriptPath = path.join(stagePath, scriptName);

// // Generate script
let preparedScriptContent = '';

preparedScriptContent += `require(${JSON.stringify(moduleInjectorPath)})(global);`;

preparedScriptContent += '(async function() {';
preparedScriptContent += sourceScriptContent;
preparedScriptContent += '\n})();';

fs.writeFileSync(preparedScriptPath, preparedScriptContent);

// Execute script
let nodeArguments = [];

if (lemonArguments.includes('--inspect')) nodeArguments.push('--inspect');
if (lemonArguments.includes('--inspect-brk')) nodeArguments.push('--inspect-brk');

if (nodeArguments.length > 0) {
	// Run as separate process
	const inspectableProcess = childProcess.spawn('node', [...nodeArguments, __filename, scriptPath, ...scriptArguments]);
	process.stdin.pipe(inspectableProcess.stdin);
	inspectableProcess.stdout.pipe(process.stdout);
	inspectableProcess.stderr.pipe(process.stderr);
} else {
	// Execute directly
	require('./injected-modules/cli')._rawArguments = scriptArguments;
	require(preparedScriptPath);
}
