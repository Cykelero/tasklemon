const path = require('path');

const Item = require('./Item');

module.exports = class File extends Item {
	get path() {
		return path.join(this.parentPath, this.name);
	}
	
	get exists() {
		return this._stats
			.then(stats => {
				return stats.isFile();
			}, () => false);
	}
}
