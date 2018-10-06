const fs = require('fs');

const SetMethod = require('./SetMethod');

class ItemPermissionsSlice {
	constructor(item) {
		this._item = item;
	}
	
	get canRead() {
		return this._getBit(2);
	}
	
	set canRead(value) {
		this._setBit(2, value);
	}
	
	get canWrite() {
		return this._getBit(1);
	}
	
	set canWrite(value) {
		this._setBit(1, value);
	}
	
	get canExecute() {
		return this._getBit(0);
	}
	
	set canExecute(value) {
		this._setBit(0, value);
	}
	
	get _encodedSliceOffset() {}
	
	get _itemStats() {
		return fs.lstatSync(this._item.path);
	}
	
	_getBit(index) {
		const encodedPermissions = this._itemStats.mode;
		return !!(encodedPermissions >> (index + this._encodedSliceOffset) & 1);
	}
	
	_setBit(index, value) {
		const encodedPermissions = this._itemStats.mode;
		const changeMask = (1 << (index + this._encodedSliceOffset));
		let newEncodedPermissions;
		
		if (value) {
			newEncodedPermissions = encodedPermissions | changeMask;
		} else {
			newEncodedPermissions = ~(~encodedPermissions | changeMask);
		}
		
		fs.chmodSync(this._item.path, newEncodedPermissions);
	}
}

ItemPermissionsSlice.prototype.set = SetMethod;

module.exports = ItemPermissionsSlice;
