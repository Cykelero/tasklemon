/* Methods for running a TL script, based on its raw source, path, and arguments. */

const path = require('path');
const fs = require('fs');
const os = require('os');

const rimraf = require('rimraf');
const crossSpawn = require('cross-spawn');

const Constants = require('./Constants');
const ScriptParser = require('./ScriptParser');
const PackageCache = require('./PackageCache');
const ScriptEnvironment = require('./ScriptEnvironment');

module.exports = {
	async run(scriptSource, scriptPath, args) {
		const parser = new ScriptParser(scriptSource);
		
		const requiredPackages = parser.requiredPackages;
		const requiredPackageVersions = parser.requiredPackageVersions;

		let stagePath;
		let preparedScriptPath;

		// Set environment variables
		ScriptEnvironment.sourceScriptPath = scriptPath;
		ScriptEnvironment.requiredRuntimeVersion = parser.requiredRuntimeVersion;
		ScriptEnvironment.rawArguments = args;
		ScriptEnvironment.defaultBundlePackageList = requiredPackages;
		ScriptEnvironment.requiredPackageVersions = requiredPackageVersions;
		//ScriptEnvironment.muteInfoMessages // Set in tasklemon.js
	
		// Write script to stage
		stagePath = fs.mkdtempSync(os.tmpdir() + path.sep);
		preparedScriptPath = path.join(stagePath, path.basename(scriptPath));
		fs.writeFileSync(preparedScriptPath, parser.preparedSource);
	
		// Preload packages
		await PackageCache.preloadPackagesForScript(parser);

		// Execute script
		require(preparedScriptPath);

		// Delete stage once script has run
		process.on('exit', () => {
			rimraf.sync(stagePath);
		});
	},
	
	runInNewProcess(scriptPath, scriptArgs, nodeArgs) {
		const inspectableProcess = crossSpawn(
			'node',
			[...nodeArgs, Constants.TASKLEMON_PATH, scriptPath, ...scriptArgs],
			{ stdio: 'inherit' }
		);

		inspectableProcess.on('exit', code => {
			process.exit(code);
		});
	}
};
