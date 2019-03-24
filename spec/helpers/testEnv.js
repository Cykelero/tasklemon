const fs = require('fs');
const os = require('os');
const path = require('path');
const childProcess = require('child_process');

const rimraf = require('rimraf');

const Item = require('../../source/Item');

function toCleanPath(nativePath) {
	return nativePath.split(path.sep).join('/');
}

function toNativePath(cleanPath) {
	return cleanPath.split('/').join(path.sep);
}

let testEnvironments = [];

beforeEach(function() {
	this.getTestEnv = function() {
		// Create environment
		const environmentParentPath = fs.realpathSync(fs.mkdtempSync(os.tmpdir() + path.sep));
		const environmentPath = path.join(environmentParentPath, 'tasklemon-test-env');
		fs.mkdirSync(environmentPath);
		
		// Register environment for cleanup
		testEnvironments.push(environmentPath);
		
		// Return environment object
		return {
			path: toCleanPath(environmentPath),
			_nativePath: environmentPath,
			
			pathFor: function(itemPath) {
				return path.posix.join(this.path, itemPath);
			},
			nativePathFor: function(nativeItemPath) {
				return path.join(this._nativePath, nativeItemPath);
			},
			itemFor: function(itemPath) {
				return Item._itemForPath(this.nativePathFor(toNativePath(itemPath)));
			},
			
			createFile: function(filePath) {
				const nativeFilePath = toNativePath(filePath);
				const completeFilePath = this.nativePathFor(nativeFilePath);
				
				fs.closeSync(fs.openSync(completeFilePath, 'w'));
				
				return toCleanPath(completeFilePath);
			},
			createFolder: function(folderPath) {
				const nativeFolderPath = toNativePath(folderPath);
				const completeFolderPath = this.nativePathFor(nativeFolderPath);
				
				fs.mkdirSync(completeFolderPath);
				
				return toCleanPath(path.join(completeFolderPath, path.sep));
			},
			
			runLemonScript: function(source, args = []) {
				const tasklemonPath = fs.realpathSync('source/tasklemon.js');
				
				const nativeScriptPath = this.nativePathFor('script.lem.js');
				fs.writeFileSync(nativeScriptPath, source);
				
				return childProcess.execFileSync('node', [tasklemonPath, nativeScriptPath, ...args], {cwd: this._nativePath});
			}
		};
	};
});

afterAll(function() {
	testEnvironments.forEach(testEnv => {
		rimraf.sync(testEnv);
	});
});
