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
	
	get path() {
		return path.join(this._parentPath, this._name) + path.sep;
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
		return getFolderSize(this.path);
	}
	
	get children() {
		this._throwIfNonexistent(`get children of`);
		return this._itemsForRawRelativePaths(fs.readdirSync(this.path));
	}
	
	file(path) {
		this._throwIfNonexistent(`get child file of`);
		if (path.slice(-1) === '/') throw Error(`“${path}” is not a file path`);
			
		return Item._itemForPath(this.path + path);
	}
	
	folder(path) {
		this._throwIfNonexistent(`get child folder of`);
		if (path.slice(-1) !== '/') throw Error(`“${path}” is not a folder path`);
			
		return Item._itemForPath(this.path + path);
	}
	
	glob(pattern, options) {
		this._throwIfNonexistent(`search children of`);
		
		const mergedOptions = Object.assign({cwd: this.path}, options);
		return this._itemsForRawRelativePaths(glob.sync(pattern, mergedOptions));
	}
	
	empty(immediately) {
		this._throwIfNonexistent(`delete children of`);
		
		return fs.readdirSync(this.path)
			.forEach(childName => {
				const childPath = path.join(this.path, childName);
				Item._deleteItem(childPath, immediately);
			});
	}
	
	_make(forgiving) {
		fs.mkdirSync(this.path);
	}
	
	_itemsForRawRelativePaths(inputPaths) {
		return inputPaths.map(inputPath => {
			const childPath = path.join(this.path, inputPath);
		
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
	if (value.slice(-1) !== '/') value += '/';
	
	return Item._itemForPath(value);
};
