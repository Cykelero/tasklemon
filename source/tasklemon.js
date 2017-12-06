#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');

const injectedModuleNames = ['root', 'home', 'here', 'cli', 'format', 'net', 'moment'];
const baseInjectedModulePath = path.join(__dirname, 'injected-modules');

const workingDirectory = process.cwd();
const scriptPath = process.argv[2];
const scriptName = path.basename(scriptPath);

let preparedScriptPath;

const scriptArguments = process.argv.slice(2);

// Prepare execution stage
// // Create stage folder
const stagePath = fs.mkdtempSync(os.tmpdir() + path.sep);
preparedScriptPath = path.join(stagePath, scriptName);

// // Generate script
let preparedScriptContent = '';

preparedScriptContent += 'const ';
injectedModuleNames.forEach((injectedModuleName, index) => {
	const injectedModulePath = path.join(baseInjectedModulePath, injectedModuleName);
	if (index > 0) preparedScriptContent += ',';
	preparedScriptContent += `${injectedModuleName} = require('${injectedModulePath}')`;
});
preparedScriptContent += ';';

preparedScriptContent += 'const _tasklemon_main = async function() {';
preparedScriptContent += fs.readFileSync(scriptPath);
preparedScriptContent += '\n};_tasklemon_main();';

fs.writeFileSync(preparedScriptPath, preparedScriptContent);

// Execute script
require(preparedScriptPath);
