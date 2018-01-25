const fs = require('fs');
const os = require('os');
const path = require('path');

const Item = require('../../source/Item');

function toClean(nativePath) {
	return nativePath.split(path.sep).join('/');
}

function toNative(cleanPath) {
	return cleanPath.split('/').join(path.sep);
}


beforeEach(function() {
	this.getTestEnv = function() {
		// Create environment
		const environmentParentPath = fs.realpathSync(fs.mkdtempSync(os.tmpdir() + path.sep));
		const environmentPath = path.join(environmentParentPath, 'tasklemon-test-env');
		fs.mkdirSync(environmentPath);
		
		// Return environment object
		return {
			path: toClean(environmentPath),
			_nativePath: environmentPath,
			
			pathFor: function(itemPath) {
				return path.posix.join(this.path, itemPath);
			},
			itemFor: function(itemPath) {
				return Item._itemForPath(this._nativePathFor(toNative(itemPath)));
			},
			
			createFile: function(filePath) {
				const nativeFilePath = toNative(filePath);
				const completeFilePath = this._nativePathFor(nativeFilePath);
				
				fs.closeSync(fs.openSync(completeFilePath, 'w'));
				
				return toClean(completeFilePath);
			},
			createFolder: function(folderPath) {
				const nativeFolderPath = toNative(folderPath);
				const completeFolderPath = this._nativePathFor(nativeFolderPath);
				
				fs.mkdirSync(completeFolderPath);
				
				return toClean(path.join(completeFolderPath, path.sep));
			},
			
			_nativePathFor: function(nativeItemPath) {
				return path.join(this._nativePath, nativeItemPath);
			}
		};
	};
});
