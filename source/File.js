const fs = require('fs');
const path = require('path');
const util = require('util');

const open = util.promisify(fs.open);
const close = util.promisify(fs.close);

const Item = require('./Item');

module.exports = class File extends Item {
	get exists() {
		return this._stats.then(stats => stats.isFile(), () => false);
	}
	
	get path() {
		return path.join(this._parentPath, this._name);
	}

	get size() {
		return this._stats.then(stats => stats.size);
	}
	
	async _make(forgiving) {
		return close(await open(this.path, 'a'));
	}
}
