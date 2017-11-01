const Item = require('./Item');

module.exports = class Folder extends Item {
	get exists() {
		return this._stats
			.then(stats => {
				return !stats.isFile();
			}, () => false);
	}
}
