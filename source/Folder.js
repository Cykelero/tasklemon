const fs = require('fs');
const path = require('path');
const util = require('util');

const mkdir = util.promisify(fs.mkdir);
const getFolderSize = util.promisify(require('get-folder-size'));

const Item = require('./Item');

module.exports = class Folder extends Item {
	get exists() {
		return this._stats.then(stats => !stats.isFile(), () => false);
	}
	
	get path() {
		return path.join(this._parentPath, this._name) + path.sep;
	}
	
	get size() {
		return getFolderSize(this.path);
	}
	
	async _make(forgiving) {
		return mkdir(this.path);
	}
}
