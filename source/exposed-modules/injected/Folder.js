/* Exposes the Folder class, only for use with the typeof operator. */

const Item = require('../Item');
const Folder = require('../Folder');

module.exports = new Proxy(Folder, {
	construct() {
		throw new Error('`Folder` cannot be called with the `new` operator; use it as a function instead.')
	},
	
	apply(target, thisArg, argumentsList) {
		return Item._itemForAbsoluteCleanPath(Folder, argumentsList[0]);
	}
});
