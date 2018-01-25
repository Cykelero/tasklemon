const childProcess = require('child_process');
const path = require('path');

const Item = require('../../source/Item');

function toClean(nativePath) {
	return nativePath.split(path.sep).join('/');
}

function toNative(cleanPath) {
	return cleanPath.split('/').join(path.sep);
}

beforeEach(function() {
	this.execFileSync = function() {
		return childProcess.execFileSync.apply(this, arguments).toString();
	};
	
	this.itemForPath = function(cleanPath) {
		return Item._itemForPath(toNative(cleanPath));
	};
});
