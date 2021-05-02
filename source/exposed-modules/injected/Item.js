/* Exposes the Item class, only for use with the typeof operator. */

const Item = require('../Item');

module.exports = new Proxy(Item, {
	construct() {
		throw new Error('`Item` cannot be called with the `new` operator; use it as a function instead.')
	},
	
	apply(target, thisArg, argumentsList) {
		return Item._itemForAbsoluteCleanPath(Item, argumentsList[0]);
	}
});
