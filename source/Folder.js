const fs = require('fs');
const path = require('path');

const glob = require('glob');

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
	
	get size() {
		this._throwIfNonexistent(`get size of`);
		
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
		return getFolderSize(this._path);
	}
	
	get children() {
		this._throwIfNonexistent(`get children of`);
		
		const childPaths =
			fs.readdirSync(this._path)
			.filter(path => path.charAt(0) !== '.')
		
		return this._itemsForRawRelativePaths(childPaths);
	}
	
	file(path) {
		if (path.slice(-1) === '/') throw Error(`“${path}” is not a file path`);
			
		return Item._itemForPath(this._path + Item._toNativePath(path));
	}
	
	folder(path) {
		if (path.slice(-1) !== '/') throw Error(`“${path}” is not a folder path`);
			
		return Item._itemForPath(this._path + Item._toNativePath(path));
	}
	
	glob(pattern, options) {
		this._throwIfNonexistent(`search children of`);
		
		return this._itemsForRawRelativePaths(glob.sync(pattern, {cwd: this._path, ...options}));
	}
	
	empty(immediately) {
		this._throwIfNonexistent(`delete children of`);
		
		return fs.readdirSync(this._path)
			.forEach(childName => {
				const childPath = path.join(this._path, childName);
				Item._deleteItem(childPath, immediately);
			});
	}
	
	get _path() {
		if (!this._isRoot) {
			return path.join(this._parentPath, this._name) + path.sep;
		} else {
			return path.join(this._parentPath, this._name);
		}
	}
	
	_make(forgiving) {
		fs.mkdirSync(this._path);
	}
	
	_itemsForRawRelativePaths(inputPaths) {
		return inputPaths.map(inputPath => {
			const childPath = path.join(this._path, inputPath);
		
			if (fs.statSync(childPath).isDirectory()) {
				return Item._itemForPath(childPath + path.sep);
			} else {
				return Item._itemForPath(childPath);
			}
		});
	}
}

module.exports = Folder;

Folder[TypeDefinition.symbol] = function(value) {
	if (value.slice(-1) !== path.sep) value += path.sep;
	
	return Item._itemForPath(value);
};
