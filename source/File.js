const Item = require('./Item');

module.exports = class File extends Item {
	get exists() {
		return this._stats
			.then(stats => {
				return stats.isFile();
			}, () => false);
	}
}
