const ItemPermissionsSlice = require('./ItemPermissionsSlice');

module.exports = class ItemOtherPermissions extends ItemPermissionsSlice {
	get _encodedSliceOffset() {
		return 0;
	}
};
