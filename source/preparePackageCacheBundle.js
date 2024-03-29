#!/usr/bin/env node
/* Run as a separate process. Prepares cache bundles (from creation to `npm install`) while handling simultaneous runs. */

const autopromise = require('./autopromise');
const path = require('path');
const fs = autopromise(require('fs'));
const readline = require('readline');

const rimraf = require('rimraf');
const crossSpawn = require('cross-spawn');

const PackageCache = require('./PackageCache');

const PULSE_FILE_NAME = 'pulse';
const PULSE_REFRESH_INTERVAL = 1000;
const PULSE_AGE_TOLERANCE = 500;
const PULSE_FILE_MAXIMUM_CREATION_DELAY = 500;

let packages;
let bundlePath;

let currentPulseInterval = null;
let firstPulseCheckDate = null;

// Functions
// // Tools
async function sleep(time) {
	return new Promise(resolve => {
		setTimeout(() => resolve(), time);
	});
}

async function doesItemExist(path) {
	return fs.lstat(path).then(() => true, () => false);
}

function logError(message) {
	console.error(message);
	
	errorLogStream.write(
		new Date().toISOString()
		+ ' '
		+ message
		+ '\n'
	);
}

// // Installation process
function parsePackageList(rawPackageList) {
	return rawPackageList.reduce((result, packageString) => {
		const [, name, version] = /^(.+?)(?:@([^@]*))?$/.exec(packageString);
		result[name] = version ? version : '*';
		return result;
	}, {});
}

async function prepareBundle() {
	if (await tryStartingInstallation()) {
		const readablePackageList = Object.keys(packages).join(', ');
		console.info(`Starting installation of ${readablePackageList}.`);
		
		startPulse();
		
		await generatePackageFile();
		await runNpmInstall();
		await createIndexFile();
		
		stopPulse();
		
		console.info('Installation successful!');
	} else {
		// Couldn't create bundle folder
		if (await fs.exists(bundlePath)) {
			console.info('Other installation already exists.');
			await checkOtherInstallationProgress(true);
		} else {
			throw new Error(`Couldn't create bundle folder.`);
		}
	}
}

async function tryStartingInstallation() {
	return fs.mkdir(bundlePath)
		.then(() => true, () => false);
}

async function checkOtherInstallationProgress(firstCheck) {
	switch (await getOtherInstallationStatus()) {
		case 'success':
			if (firstCheck) {
				console.info('Other installation was successful!');
			} else {
				console.info('Other installation successfully finished!');
			}
			break;
		case 'aborted':
			if (firstCheck) {
				console.info('Other installation is incomplete. Cleaning it up.');
			} else {
				console.info('Other installation was aborted. Cleaning it up.');
			}
			
			rimraf.sync(bundlePath);
			await prepareBundle();
			break;
		case 'pending':
			if (firstCheck) {
				console.info('Waiting for installation to finish...');
			}
			await sleep(PULSE_REFRESH_INTERVAL);
			await checkOtherInstallationProgress();
			break;
	}
}

async function getOtherInstallationStatus() {
	if (await doesItemExist(bundlePath + PackageCache.INDEX_FILE_NAME)) {
		return 'success';
	} else if (await isPulseOld()) {
		return 'aborted';
	} else {
		return 'pending';
	}
}

async function generatePackageFile() {
	// Generate content
	const dependencyKey = packageCount === 1 ? 'dependencies' : 'optionalDependencies';
	
	const packageFileData = {
		[dependencyKey]: packages
	};
	
	// Write content
	const packageFileContent = JSON.stringify(packageFileData);
	await fs.writeFile(bundlePath + 'package.json', packageFileContent);
}

async function runNpmInstall() {
	// Run `npm install`
	const installProcess = crossSpawn('npm', ['install'], { cwd: bundlePath });
	
	// Log any errors
	const stderrReadline = readline.createInterface({
		input: installProcess.stderr,
		terminal: false
	});
	
	stderrReadline.on('line', errorData => {
		logError(errorData.toString());
	});
	
	// Wait for exit
	return new Promise((resolve, reject) => {
		installProcess.on('exit', code => {
			if (code === 0) {
				resolve();
			} else {
				reject(Error('`npm install` failed (code ' + code + ').'));
			}
		});
	});
}

async function createIndexFile() {
	const templatePath = path.join(__dirname, 'packageCacheBundleIndexFile.template.js');
	await fs.copyFile(templatePath, bundlePath + PackageCache.INDEX_FILE_NAME);
}

// // Pulse
function startPulse() {
	function writePulseFile() {
		fs.writeFile(bundlePath + PULSE_FILE_NAME, Date.now().toString());
	}
	
	currentPulseInterval = setInterval(writePulseFile, PULSE_REFRESH_INTERVAL);
	writePulseFile();
}

function stopPulse() {
	clearInterval(currentPulseInterval);
	fs.unlink(bundlePath + PULSE_FILE_NAME);
}

async function isPulseOld() {
	const pulseFilePath = bundlePath + PULSE_FILE_NAME;
	
	if (firstPulseCheckDate === null) {
		firstPulseCheckDate = Date.now();
	}
	
	// Try reading pulse
	try {
		const pulseDateString = await fs.readFile(pulseFilePath, {encoding: 'utf8'});
		const pulseDate = Number(pulseDateString);
		
		return Date.now() > pulseDate + PULSE_REFRESH_INTERVAL + PULSE_AGE_TOLERANCE;
	} catch(e) {
		// Pulse file doesn't exist
		if (Date.now() > firstPulseCheckDate + PULSE_FILE_MAXIMUM_CREATION_DELAY) {
			// Pulse file wasn't created in time: assume installation stopped
			return true;
		} else {
			// Maybe the installation has only recently started
			return false;
		}
	}
}

// Run
const errorLogStream = require('fs').createWriteStream(__dirname + '/../preparePackageCacheBundle.errors.log', { flags: 'a' });

const packageList = process.argv.slice(2);
packages = parsePackageList(packageList);
const packageCount = Object.entries(packages).length;

bundlePath = PackageCache._bundlePathForList(packageList);

prepareBundle()
	.catch(async function(error) {
		logError(error.message);
		
		// If the index file isn't created after a dedicated package failure, the PackageCache.js retry logic becomes significantly slower.
		// Ideally the issue should be fixed in PackageCache.js; but for now, this workaround maintains the behavior we want. (e.g. requiring modules from this bundle will fail, and so the bundle will be marked for deletion)
		if (packageCount === 1) {
			await createIndexFile();
		}
		
		// Exit
		process.exit(1);
	});
