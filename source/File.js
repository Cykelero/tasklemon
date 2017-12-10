const fs = require('fs');
const path = require('path');

const Item = require('./Item');

module.exports = class File extends Item {
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
	
	_make(forgiving) {
		fs.closeSync(fs.openSync(this.path, 'a'));
	}
}
