const path = require('path');
const fs = require('fs');
const os = require('os');

const rimraf = require('rimraf');
const crossSpawn = require('cross-spawn');

const Constants = require('./Constants');
const ScriptParser = require('./ScriptParser');
const PackageCache = require('./PackageCache');
const Tools = require('./Tools');
const Environment = require('./injected-modules/Environment')

module.exports = {
	// Exposed
	run(scriptSource, scriptPath, args) {
		const parser = new ScriptParser(scriptSource);
		
		const requiredPackages = parser.requiredPackages;
		const requiredPackageVersions = parser.requiredPackageVersions;

		let stagePath;
		let preparedScriptPath;

		// Set environment variables
		Environment.sourceScriptPath = scriptPath;
		Environment.rawArguments = args;
		Environment.defaultBundlePackageList = requiredPackages;
		Environment.requiredPackageVersions = requiredPackageVersions;
	
		// Write script to stage
		stagePath = fs.mkdtempSync(os.tmpdir() + path.sep);
		preparedScriptPath = path.join(stagePath, path.basename(scriptPath));
		fs.writeFileSync(preparedScriptPath, parser.preparedSource);
	
		// Preload packages asynchronously
		PackageCache.loadPackageBundle(requiredPackages, requiredPackageVersions);

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
