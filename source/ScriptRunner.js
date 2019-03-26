const path = require('path');
const fs = require('fs');
const os = require('os');

const rimraf = require('rimraf');
const crossSpawn = require('cross-spawn');

const ScriptParser = require('./ScriptParser');
const PackageCache = require('./PackageCache');
const Tools = require('./Tools');

const TASKLEMON_PATH = path.join(__dirname, 'tasklemon.js');

module.exports = {
	// Exposed
	run(scriptSource, scriptName, args) {
		const parser = new ScriptParser(scriptSource);

		let stagePath;
		let preparedScriptPath;
	
		// Preload packages asynchronously
		PackageCache.preloadPackageBundle(parser.requiredPackages);
	
		// Write script to stage
		stagePath = fs.mkdtempSync(os.tmpdir() + path.sep);
		preparedScriptPath = path.join(stagePath, scriptName);
		fs.writeFileSync(preparedScriptPath, parser.preparedSource);

		// Execute script
		require('./injected-modules/cli')._rawArguments = args;
		require(preparedScriptPath);

		// Delete stage once script has run
		process.on('exit', () => {
			rimraf.sync(stagePath);
		});
	},
	
	runInNewProcess(scriptPath, scriptArgs, nodeArgs) {
		const inspectableProcess = crossSpawn(
			'node',
			[...nodeArgs, TASKLEMON_PATH, scriptPath, ...scriptArgs],
			{ stdio: 'inherit' }
		);

		inspectableProcess.on('exit', code => {
			process.exit(code);
		});
	}
};
