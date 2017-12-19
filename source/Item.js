const path = require('path');
const fs = require('fs');
const childProcess = require('child_process');

const moment = require('moment');

const TypeDefinition = require('./TypeDefinition');

class Item {
	constructor(parentPath, name) {
		this._parentPath = parentPath;
		this._name = name;
	}
	
	get exists() { }
	
	get path() { }
	
	get name() {
		return this._name;
	}
	
	get size() { }
	
	get parent() {
		return this._isRoot ? null : Item._itemForPath(this._parentPath);
	}
	
	get dateCreated() {
		return moment(this._stats.birthtime);
	}
	
	get dateModified() {
		return moment(this._stats.mtime);
	}
	
	get user() {
		return childProcess.execSync(`ls -ld "${this.path}"`)
			.toString().replace(/\s+/g, ' ').split(' ')[2];
	}
	
	get group() {
		return childProcess.execSync(`ls -ld "${this.path}"`)
			.toString().replace(/\s+/g, ' ').split(' ')[3];
	}
	
	make(forgiving) {
		// Fail or abort if item exists
		if (this.exists) {
			if (!forgiving) {
				if (!this._isRoot) {
					throw new Error(`Can't make “${this.name}”: already exists in “${this.parent.path}”`);
				} else {
					throw new Error(`Can't make “/”: already exists`);
				}
			} else {
				return this;
			}
		}
		
		// If forgiving, create parents if necessary
		if (forgiving) Item._makeParentHierarchy(this.path);
		
		// Create item
		this._make(forgiving);
		
		return this;
	}
	
	moveTo(destination, forgiving) {
		const isFolder = this instanceof require('./Folder');
		const targetPath = destination.path + this.name + (isFolder ? '/' : '');
		
		// Feasibility checks
		if (!(destination instanceof require('./Folder'))) {
			throw Error(`Can't move “${this.name}”: destination is not a folder`);
		}
		
		if (fs.existsSync(targetPath)) {
			throw Error(`Can't move “${this.name}”: target already exists`);
		}
		
		// Create parents if necessary
		if (forgiving) Item._makeParentHierarchy(targetPath);

		// Move filesystem item (and possibly throw)
		fs.renameSync(this.path, targetPath);
		
		// Update paths of all related items
		const thisPath = this.path;
		const pathLength = thisPath.length;
		const knownItemPaths = Object.keys(Item._itemsByPath);
		
		knownItemPaths.forEach(itemPath => {
			const isRelated = isFolder ?
				itemPath.slice(0, pathLength) === thisPath :
				itemPath === thisPath;
			
			if (isRelated) {
				const newItemPath = targetPath + itemPath.slice(pathLength);
				const newParentPath = path.dirname(newItemPath) + '/';
				
				for (let relatedItem of Item._itemsByPath[itemPath].values()) {
					Item._deregisterItem(relatedItem);
					relatedItem._parentPath = newParentPath;
					Item._registerItem(relatedItem);
				};
			}
		});
		
		return this;
	}
	
	copyTo(destination, forgiving) {
		const isFolder = this instanceof require('./Folder');
		const targetPath = destination.path + this.name + (isFolder ? '/' : '');
		
		// Feasibility checks
		if (!(destination instanceof require('./Folder'))) {
			throw Error(`Can't copy “${this.name}”: destination is not a folder`);
		}
		
		if (fs.existsSync(targetPath)) {
			throw Error(`Can't copy “${this.name}”: target already exists`);
		}
		
		// Create parents if necessary
		if (forgiving) Item._makeParentHierarchy(targetPath);

		// Move filesystem item (and possibly throw)
		function recursivelyCopyItem(itemPath, targetPath) {
			const itemStats = fs.statSync(itemPath);
			if (itemStats.isDirectory()) {
				// Create folder
				fs.mkdirSync(targetPath, {mode: itemStats.mode});
				
				// Copy children
				return fs.readdirSync(itemPath).forEach(childName => {
					const childPath = path.join(itemPath, childName);
					const childTargetPath = path.join(targetPath, childName);
					recursivelyCopyItem(childPath, childTargetPath);
				});
			} else {
				fs.copyFileSync(itemPath, targetPath);
			}
		};

		recursivelyCopyItem(this.path, targetPath);
		
		return Item._itemForPath(targetPath);
	}
	
	get _isRoot() {
		return this.name === '';
	}
	
	get _stats() {
		return fs.lstatSync(this.path);
	}
	
	_make() { }
	
	static _itemForPath(inputPath) {
		let result;
		let isFolder;
		let completePath;
		let name;

		const parentPath = Item._realParentPathForPath(inputPath);
		
		// Parse path
		isFolder = (inputPath.slice(-1) === '/');
		name = path.basename(inputPath);
		completePath = path.join(parentPath, name) + (isFolder ? '/' : '');
		
		// Find or create item
		const itemClass = isFolder ? require('./Folder') : require('./File');
		result = new itemClass(parentPath, name);
		
		Item._registerItem(result, parentPath);
		
		return result;
	}
	
	static _realParentPathForPath(inputPath) {
		let parentPathExistent = path.dirname(inputPath);
		let parentPathNonexistent = '';
		let resolvedParentPathExistent = null;
		
		while (!resolvedParentPathExistent) {
			try {
				resolvedParentPathExistent = fs.realpathSync(parentPathExistent);
			} catch (e) {
				const lastPathPiece = path.basename(parentPathExistent);
				parentPathExistent = parentPathExistent.slice(0, -lastPathPiece.length - 1);
				parentPathNonexistent = `/${lastPathPiece}${parentPathNonexistent}`;
			}
		}
		
		return `${resolvedParentPathExistent}${parentPathNonexistent}/`;
	}
	
	static _registerItem(item) {
		const itemPath = item.path;
		if (!Item._itemsByPath[itemPath]) Item._itemsByPath[itemPath] = new Set();
		
		Item._itemsByPath[itemPath].add(item);
	}
	
	static _deregisterItem(item) {
		const itemPath = item.path;
		Item._itemsByPath[itemPath].delete(item);
	}
	
	static _makeParentHierarchy(itemPath) {
		const parentPath = path.dirname(itemPath);
		if (!fs.existsSync(parentPath)) {
			this._makeParentHierarchy(parentPath);
			fs.mkdirSync(parentPath);
		}
	}
}

Item._itemsByPath = {};

module.exports = Item;

Item[TypeDefinition.symbol] = value => Item._itemForPath(value);
