const path = require('path');
const fs = require('fs');
const util = require('util');
const childProcess = require('child_process');

const lstat = util.promisify(fs.lstat);
const exec = util.promisify(childProcess.exec);

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
		if (this.name === '') {
			// Root
			return null;
		} else {
			return Item.itemForPath(this._parentPath);
		}
	}
	
	get dateCreated() {
		return this._stats.then(stats => moment(stats.birthtime));
	}
	
	get dateModified() {
		return this._stats.then(stats => moment(stats.mtime));
	}
	
	get user() {
		return exec(`ls -ld "${this.path}"`)
			.then(output => output.stdout.replace(/\s+/g, ' ').split(' ')[2]);
	}
	
	get group() {
		return exec(`ls -ld "${this.path}"`)
			.then(output => output.stdout.replace(/\s+/g, ' ').split(' ')[3]);
	}
	
	async make(forgiving) {
		// Fail or abort if item exists
		if (await this.exists) {
			if (!forgiving) {
				if (this.name) {
					throw new Error(`Can't make “${this.name}”: already exists in “${this.parent.path}”`);
				} else {
					throw new Error(`Can't make “/”: already exists`);
				}
			} else {
				return this;
			}
		}
		
		// If forgiving, create parents if necessary
		if (forgiving && this.name !== '') {
			await this.parent.make(true);
		}
		
		// Create item
		return this._make(forgiving).then(() => this);
	}
	
	get _stats() {
		return lstat(this.path);
	}
	
	async _make() { }
	
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
