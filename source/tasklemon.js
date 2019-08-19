#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const Constants = require('./Constants');
const PackageCache = require('./PackageCache');
const ScriptFile = require('./ScriptFile');
const ScriptRunner = require('./ScriptRunner');
const ScriptParser = require('./ScriptParser');
const Tools = require('./Tools');

const validLemonArguments = [
	// Package cache
	'--preload-pkg',
	'--clear-pkg-cache',
	
	// Package/runtime pinning
	'--pin-pkg',
	'--no-pin'
];
const validNodeArguments = ['--inspect', '--inspect-brk'];

function createPackageCacheFolder() {
	try {
		fs.mkdirSync(Constants.CACHE_PATH);
	} catch (e) {}

	try {
		fs.mkdirSync(PackageCache.PACKAGE_CACHE_PATH);
	} catch (e) {}
}

function parseProgramArguments(argumentList) {
	let rawArguments = argumentList.slice(2); // skip “node” and “tasklemon”
	
	// Consume runtime version
	let requestedRuntimeVersion = null;
	
	const firstArg = rawArguments[0];
	if (/^v\d(\.\d(\.\d)?)?$/.test(firstArg)) {
		requestedRuntimeVersion = firstArg;
		rawArguments = rawArguments.slice(1);
	}
	
	// Separate script argument from ours
	let scriptPathIndex = rawArguments.findIndex(arg => (arg[0] !== '-'));
	if (scriptPathIndex === -1) scriptPathIndex = rawArguments.length;
	
	const ourArguments = rawArguments.slice(0, scriptPathIndex);
	const scriptArguments = rawArguments.slice(scriptPathIndex + 1);
	
	// Separate Tasklemon args from Node args
	const lemonArguments = ourArguments.filter(arg => validLemonArguments.includes(arg));
	const nodeArguments = ourArguments.filter(arg => validNodeArguments.includes(arg));
	
	// Check for unrecognized arguments
	exitIfContainsInvalidArguments(ourArguments);
	
	// Get absolute script path
	let absoluteScriptPath;
	
	const relativeScriptPath = rawArguments[scriptPathIndex];
	if (relativeScriptPath) {
		const scriptName = path.basename(relativeScriptPath);
	
		Tools.tryOrExitWithError(() => {
			absoluteScriptPath = fs.realpathSync(relativeScriptPath);
		}, `Couldn't execute “${scriptName}” because of error: “$0”`);
	}
	
	// Return
	return {
		requestedRuntimeVersion,
		scriptPath: absoluteScriptPath,
		lemonArguments,
		nodeArguments,
		scriptArguments
	};
}

function getActionsForForArguments(args) {
	const actions = {};
	
	actions.preloadPackages = args.includes('--preload-pkg');
	actions.clearPackageCache = args.includes('--clear-pkg-cache');
	actions.pinPackageVersions = args.includes('--pin-pkg');
	
	actions.runScript =
		!actions.preloadPackages
		&& !actions.clearPackageCache
		&& !actions.pinPackageVersions;
	
	actions.pinRuntimeVersion = actions.runScript && !args.includes('--no-pin');
	
	return actions;
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

// Init
createPackageCacheFolder();

// Run
const programArgs = parseProgramArguments(process.argv);
const actionsToPerform = getActionsForForArguments(programArgs.lemonArguments);
const scriptFile = new ScriptFile(programArgs.scriptPath);

// Clear package cache
if (actionsToPerform.clearPackageCache) {
	const bundleCount = fs.readdirSync(PackageCache.PACKAGE_CACHE_PATH)
		.filter(path => path.charAt(0) !== '.')
		.length;
	
	if (bundleCount > 0) {
		PackageCache.clearAll();

		const bundleCountString = (bundleCount > 1) ? bundleCount + ' bundles' : '1 bundle';
		process.stdout.write(`Cleared package cache (deleted ${bundleCountString}).\n`);
	} else {
		process.stdout.write('Package cache is already empty.\n');
	}
}

// Pin runtime version
if (actionsToPerform.pinRuntimeVersion) {
	const parser = new ScriptParser(scriptFile.source);
	const didPin = parser.pinRuntimeVersion();
	
	if (didPin) {
		Tools.tryOrExitWithError(() => {
			scriptFile.setSourceOrThrow(parser.source);
		}, `Couldn't pin runtime version of “${scriptFile.name}” because of error: “$0”`
			+ `\nTo execute the script without automatic pinning, specify the \`--no-pin\` option.`
		);
	}
}

// Pin package versions
if (actionsToPerform.pinPackageVersions) {
	// Pin
	const parser = new ScriptParser(scriptFile.source);
	const pinnedInfo = parser.pinPackageVersions();
	scriptFile.source = parser.source;
	
	// Display outcome
	if (pinnedInfo.length > 0) {
		const pinnedList = pinnedInfo
			.map(info => info.name + '@' + info.version)
			.join(', ');

		process.stdout.write(`Pinned ${pinnedList}.\n`);
	} else {
		process.stdout.write(`Pinned nothing.\n`);
	}
}

// Preload packages
if (actionsToPerform.preloadPackages) {
	const parser = new ScriptParser(scriptFile.source);
	if (parser.requiredPackages.length > 0) {
		PackageCache.loadPackageBundleSync(parser.requiredPackages, parser.requiredPackageVersions);
		
		const readablePackageList = PackageCache.readableRequiredPackageListFor(parser.requiredPackages, parser.requiredPackageVersions);
		process.stdout.write(`Preloaded ${readablePackageList}.\n`);
	} else {
		process.stdout.write('Preloaded nothing: script requires no package.\n');
	}
}

// Run script
if (actionsToPerform.runScript) {
	if (programArgs.nodeArguments.length > 0) {
		// As separate process
		ScriptRunner.runInNewProcess(
			programArgs.scriptPath,
			programArgs.scriptArguments,
			programArgs.nodeArguments
		);
	} else {
		// In place
		ScriptRunner.run(
			scriptFile.source,
			scriptFile.path, 
			programArgs.scriptArguments
		);
	}
}
