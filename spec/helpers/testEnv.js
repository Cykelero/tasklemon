const fs = require('fs');
const os = require('os');
const path = require('path');

const Item = require('../../source/Item');

beforeEach(function() {
	this.getTestEnv = function() {
		const environmentParentPath = fs.realpathSync(fs.mkdtempSync(os.tmpdir() + path.sep));
		const environmentPath = path.join(environmentParentPath, 'tasklemon-test-env');
		fs.mkdirSync(environmentPath);
		
		return {
			path: environmentPath,
			createFile: function(filePath) {
				const completeFilePath = this.pathFor(filePath);
				fs.closeSync(fs.openSync(completeFilePath, 'w'));
				return completeFilePath;
			},
			createFolder: function(folderPath) {
				const completeFolderPath = this.pathFor(folderPath);
				fs.mkdirSync(completeFolderPath);
				return path.join(completeFolderPath, path.sep);
			},
			pathFor: function(itemPath) {
				return path.join(this.path, itemPath);
			},
			itemFor: function(itemPath) {
				return Item._itemForPath(this.pathFor(itemPath));
			}
		};
	};
});
