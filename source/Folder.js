const fs = require('fs');
const path = require('path');

const rimraf = require('rimraf');

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
	
	file(path) {
		if (path.slice(-1) === '/') throw Error(`“${path}” is not a file path`);
			
		return Item._itemForPath(this.path + path);
	}
	
	folder(path) {
		if (path.slice(-1) !== '/') throw Error(`“${path}” is not a folder path`);
			
		return Item._itemForPath(this.path + path);
	}
	
	empty() {
		return fs.readdirSync(this.path)
			.forEach(childName => {
				const childPath = path.join(this.path, childName);
				rimraf.sync(childPath);
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
