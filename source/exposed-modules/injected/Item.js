/* Exposes the Item class, only for use with the typeof operator. */

const Item = require('../Item');

module.exports = new Proxy(Item, {
	construct() {
		throw new Error('You cannot instantiate this class directly. To obtain a reference to a file or folder, start with an entry point: `root`, `home` or `here`.')
	}
});
