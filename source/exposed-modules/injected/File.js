/* Exposes the File class, only for use with the typeof operator. */

const Item = require('../Item');
const File = require('../File');

module.exports = new Proxy(File, {
	construct() {
		throw new Error('`File` cannot be called with the `new` operator; use it as a function instead.')
	},
	
	apply(target, thisArg, argumentsList) {
		return Item._itemForAbsoluteCleanPath(File, argumentsList[0]);
	}
});
