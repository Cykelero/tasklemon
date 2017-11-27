const path = require('path');

const Item = require('./Item');

module.exports = class Folder extends Item {
	get path() {
		return path.join(this._parentPath, this._name) + path.sep;
	}
	
	get exists() {
		return this._stats
			.then(stats => {
				return !stats.isFile();
			}, () => false);
	}
}
