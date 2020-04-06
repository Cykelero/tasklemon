#!/usr/bin/env node
/* Run as a separate process. Prepares cache bundles (from creation to `npm install`) while handling simultaneous runs. */

const autopromise = require('./autopromise');
const path = require('path');
const fs = autopromise(require('fs'));
const childProcess = require('child_process');

const rimraf = require('rimraf');
const crossSpawn = require('cross-spawn');

const PackageCache = require('./PackageCache');

const PULSE_FILE_NAME = 'pulse';
const PULSE_REFRESH_INTERVAL = 1000;
const PULSE_AGE_TOLERANCE = 500;
const PULSE_FILE_MAXIMUM_CREATION_DELAY = 500;

let packages;
let bundlePath;

let isPulsing = false;
let currentPulseTimeout = null;
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

// // Installation process
function parsePackageList(rawPackageList) {
	return rawPackageList.reduce((result, packageString) => {
		const [, name, version] = /([^@]+)@?(.*)/.exec(packageString);
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
		console.info('Other installation already exists.');
		await checkOtherInstallationProgress(true);
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
	const packageFileData = {
		optionalDependencies: packages
	};
	
	// Write content
	const packageFileContent = JSON.stringify(packageFileData);
	await fs.writeFile(bundlePath + 'package.json', packageFileContent);
}

async function runNpmInstall() {
	const installProcess = crossSpawn('npm', ['install'], {cwd: bundlePath});
	
	return new Promise((resolve, reject) => {
		installProcess.on('exit', code => {
			if (code === 0) {
				resolve();
			} else {
				throw Error('`npm install` failed.');
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
	isPulsing = true;
	
	function schedulePulse() {
		currentPulseTimeout = setTimeout(() => {
			if (isPulsing) {
				fs.writeFile(bundlePath + PULSE_FILE_NAME, Date.now());
				schedulePulse();
			}
		}, PULSE_REFRESH_INTERVAL);
	}
	
	schedulePulse();
}

function stopPulse() {
	isPulsing = false;
	clearInterval(currentPulseTimeout);
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
const packageList = process.argv.slice(2);
packages = parsePackageList(packageList);

bundlePath = PackageCache._bundlePathForList(packageList);

prepareBundle()
	.catch(() => process.exit(1));
