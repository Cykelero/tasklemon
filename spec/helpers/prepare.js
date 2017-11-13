const fs = require('fs');
const os = require('os');
const path = require('path');

beforeEach(function() {
	this.getTestEnv = function() {
		return {
			path: fs.realpathSync(fs.mkdtempSync(os.tmpdir() + path.sep)),
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
			}
		};
	};
});
