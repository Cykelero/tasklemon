const childProcess = require('child_process');
const path = require('path');

const Item = require('../../source/Item');

beforeEach(function() {
	this.execFileSync = function() {
		return childProcess.execFileSync.apply(this, arguments).toString();
	};

	this.toCleanPath = function(nativePath) {
		return nativePath.split(path.sep).join('/');
	};

	this.toNativePath = function(cleanPath) {
		return cleanPath.split('/').join(path.sep);
	};
	
	this.itemForPath = function(cleanPath) {
		return Item._itemForPath(this.toNativePath(cleanPath));
	};
});
