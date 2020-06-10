/* Exposes and allow changing the user permissions of a given item, based on the item's stats object. */

const fs = require('fs');
const childProcess = require('child_process');

const ItemPermissionsSlice = require('./ItemPermissionsSlice');

module.exports = class ItemUserPermissions extends ItemPermissionsSlice {
	get id() {
		return this._itemStats.uid;
	}
	
	set id(value) {
		const currentGid = this._itemStats.gid;
		fs.lchownSync(this._item.path, value, currentGid);
	}
	
	get name() {
		return childProcess.execFileSync('ls', ['-ld', this._item.path])
			.toString().replace(/\s+/g, ' ').split(' ')[2];
	}
	
	set name(value) {
		childProcess.execFileSync('chown', [value, this._item.path]);
	}
	
	get _encodedSliceOffset() {
		return 6;
	}
};
