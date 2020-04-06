/* Exposes and allow changing the other permissions of a given item, based on the item's stats object. */

const ItemPermissionsSlice = require('./ItemPermissionsSlice');

module.exports = class ItemOtherPermissions extends ItemPermissionsSlice {
	get _encodedSliceOffset() {
		return 0;
	}
};
