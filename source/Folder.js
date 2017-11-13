const path = require('path');

const Item = require('./Item');

module.exports = class Folder extends Item {
	get path() {
		return path.join(this.parentPath, this.name) + path.sep;
	}
	
	get exists() {
		return this._stats
			.then(stats => {
				return !stats.isFile();
			}, () => false);
	}
}
