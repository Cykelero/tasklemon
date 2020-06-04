/* Represents a folder on disk; exposes and allow changing its data and metadata. */

const fs = require('fs');
const path = require('path');

const glob = require('glob');

const Item = require('./Item');
const TypeDefinition = require('../TypeDefinition');

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
	
	file(cleanPath) {
		const nativePath = Item._toNativePath(cleanPath);
		
		if (cleanPath.slice(-1) === '/') throw Error(`“${cleanPath}” is not a file path (ends with a slash)`);
		
		if (Item._isAbsolutePath(nativePath)) {
			if (!this._isRoot) throw Error(`“${cleanPath}” is an absolute path but the folder is not a root folder`);
			
			return Item._itemForPath(nativePath);
		} else {
			return Item._itemForPath(this._path + nativePath);
		}
	}
	
	folder(cleanPath) {
		const nativePath = Item._toNativePath(cleanPath);
		
		if (cleanPath.slice(-1) !== '/') throw Error(`“${cleanPath}” is not a folder path (does not end with a slash)`);
		
		if (Item._isAbsolutePath(nativePath)) {
			if (!this._isRoot) throw Error(`“${cleanPath}” is an absolute path but the folder is not a root folder`);
			
			return Item._itemForPath(nativePath);
		} else {
			return Item._itemForPath(this._path + nativePath);
		}
	}
	
	glob(pattern, options) {
		this._throwIfNonexistent(`search children of`);
		
		return this._itemsForRawRelativePaths(glob.sync(pattern, {cwd: this._path, ...options}));
	}
	
	empty(immediately) {
		this._throwIfNonexistent(`delete children of`);
		
		fs.readdirSync(this._path)
			.forEach(childName => {
				const childPath = path.join(this._path, childName);
				Item._deleteItem(childPath, immediately);
			});
		
		return this;
	}
	
	get _path() {
		return this._parentPath + this._name + path.sep;
	}
	
	_make() {
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
