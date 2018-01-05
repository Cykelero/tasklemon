const fs = require('fs');
const childProcess = require('child_process');

const ItemPermissionsSlice = require('./ItemPermissionsSlice');

module.exports = class ItemGroupPermissions extends ItemPermissionsSlice {
	get id() {
		return this._itemStats.gid;
	}
	
	set id(value) {
		const uid = this._itemStats.uid;
		fs.lchownSync(this._item.path, uid, value);
	}
	
	get name() {
		return childProcess.execSync(`ls -ld "${this._item.path}"`)
			.toString().replace(/\s+/g, ' ').split(' ')[3];
	}
	
	set name(value) {
		childProcess.execSync(`chown :${value} "${this._item.path}"`);
	}
	
	get _encodedSliceOffset() {
		return 3;
	}
};
