const fs = require('fs');
const path = require('path');

const Item = require('./Item');
const TypeDefinition = require('./TypeDefinition');

class Folder extends Item {
	get exists() {
		try {
			return !this._stats.isFile();
		} catch (e) {
			return false;
		}
	}
	
	get path() {
		return path.join(this._parentPath, this._name) + path.sep;
	}
	
	get size() {
		function getFolderSize(folderPath) {
			return fs.readdirSync(folderPath).reduce((accumulatedSize, childName) => {
				const childPath = path.join(folderPath, childName);
				const childStats = fs.statSync(childPath);
				
				if (childStats.isDirectory()) {
					accumulatedSize += getFolderSize(childPath);
				} else {
					accumulatedSize += childStats.size;
				}
				
				return accumulatedSize;
			}, 0);
		}
		return getFolderSize(this.path);
	}
	
	get children() {
		return fs.readdirSync(this.path)
			.map(childName => {
				const childPath = path.join(this.path, childName);
			
				if (fs.statSync(childPath).isDirectory()) {
					return Item._itemForPath(childPath + path.sep);
				} else {
					return Item._itemForPath(childPath);
				}
			});
	}
	
	_make(forgiving) {
		fs.mkdirSync(this.path);
	}
}

module.exports = Folder;

Folder[TypeDefinition.symbol] = function(value) {
	if (value.slice(-1) !== '/') value += '/';
	
	return Item._itemForPath(value);
};
