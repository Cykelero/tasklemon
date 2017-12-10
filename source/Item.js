const path = require('path');
const fs = require('fs');
const childProcess = require('child_process');

const moment = require('moment');

module.exports = class Item {
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
		return this._isRoot	? null : Item.itemForPath(this._parentPath);
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
		if (forgiving) this.parent.make(true);
		
		// Create item
		this._make(forgiving);
		
		return this;
	}
	
	get _isRoot() {
		return this.name === '';
	}
	
	get _stats() {
		return fs.lstatSync(this.path);
	}
	
	_make() { }
	
	static itemForPath(inputPath) {
		let result;
		let parentPath;
		let isFolder;
		let completePath;
		let name;
		
		// Resolve parent path
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
		
		parentPath = `${resolvedParentPathExistent}${parentPathNonexistent}/`;
		
		// Parse path
		isFolder = (inputPath.slice(-1) === '/');
		name = path.basename(inputPath);
		completePath = path.join(parentPath, name) + (isFolder ? '/' : '');
		
		// Find or create item
		result = knownItems[completePath];
		
		if (!result) {
			const itemClass = isFolder ? require('./Folder') : require('./File');
			result = new itemClass(parentPath, name);
			knownItems[completePath] = result;
		}
		
		return result;
	}
}

let knownItems = {};
