/* Exposes and allow changing the group permissions of a given item, based on the item's stats object. */

const fs = require('fs');
const childProcess = require('child_process');

const ItemPermissionsSlice = require('./ItemPermissionsSlice');

module.exports = class ItemGroupPermissions extends ItemPermissionsSlice {
	get id() {
		return this._itemStats.gid;
	}
	
	set id(value) {
		const currentUid = this._itemStats.uid;
		fs.lchownSync(this._item.path, currentUid, value);
	}
	
	get name() {
		return childProcess.execFileSync('ls', ['-ld', this._item.path])
			.toString().replace(/\s+/g, ' ').split(' ')[3];
	}
	
	set name(value) {
		childProcess.execFileSync('chown', [':' + value, this._item.path]);
	}
	
	get _encodedSliceOffset() {
		return 3;
	}
};
