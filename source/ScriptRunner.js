const path = require('path');
const fs = require('fs');
const os = require('os');

const rimraf = require('rimraf');
const crossSpawn = require('cross-spawn');

const ScriptParser = require('./ScriptParser');
const PackageCache = require('./PackageCache');
const Tools = require('./Tools');

const TASKLEMON_PATH = __filename;

module.exports = {
	// Exposed
	run(scriptPath, args) {
		const source = this._readSource(scriptPath);
		const parser = new ScriptParser(source);

		let stagePath;
		let preparedScriptPath;
	
		// Preload packages asynchronously
		PackageCache.preloadPackageBundle(parser.requiredPackages);
	
		// Write script to stage
		stagePath = fs.mkdtempSync(os.tmpdir() + path.sep);
		preparedScriptPath = path.join(stagePath, path.basename(scriptPath));
		fs.writeFileSync(preparedScriptPath, parser.preparedSource);

		// Execute script
		require('./injected-modules/cli')._rawArguments = args;
		require(preparedScriptPath);

		// Delete stage once script has run
		process.on('exit', () => {
			rimraf.sync(stagePath);
		});
	},
	
	runInNewProcess(scriptPath, args, nodeArgs) {
		const inspectableProcess = crossSpawn(
			'node',
			[...nodeArgs, TASKLEMON_PATH, scriptPath, ...args],
			{ stdio: 'inherit' }
		);

		inspectableProcess.on('exit', code => {
			process.exit(code);
		});
	},
	
	// Internal
	_readSource(scriptPath) {
		try {
			return fs.readFileSync(scriptPath, {encoding: 'utf8'});
		} catch (error) {
			const scriptName = path.basename(scriptPath);
			const parsedError = Tools.parseNodeError(error);
			Tools.exitWithError(`Couldn't read “${scriptName}” because of error: “${parsedError}”.`);
		}
	}
};
