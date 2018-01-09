const fs = require('fs');
const path = require('path');

const md5File = require('md5-file');

const Item = require('./Item');
const TypeDefinition = require('./TypeDefinition');

class File extends Item {
	get exists() {
		try {
			return this._stats.isFile();
		} catch (e) {
			return false;
		}
	}
	
	get path() {
		return path.join(this._parentPath, this._name);
	}

	get size() {
		return this._stats.size;
	}
	
	get md5() {
		return md5File.sync(this.path);
	}
	
	_make(forgiving) {
		fs.closeSync(fs.openSync(this.path, 'a'));
	}
}

module.exports = File;

File[TypeDefinition.symbol] = function(value) {
	if (value.slice(-1) === '/') {
		throw 'is not a file';
	}
	
	return Item._itemForPath(value);
};
