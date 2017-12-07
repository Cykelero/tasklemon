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
	
	get _stats() {
		return lstat(this.path);
	}
	
	static itemForPath(itemPath) {
		// Resolve path
		const parentPath = fs.realpathSync(path.dirname(itemPath));
		const name = path.basename(itemPath);
		const isFolder = (itemPath.slice(-1) === '/');
		
		const completePath = path.join(parentPath, name) + (isFolder ? '/' : '');
		
		// Find or create item
		let item = knownItems[completePath];
		
		if (!item) {
			const itemClass = isFolder ? require('./Folder') : require('./File');
			item = new itemClass(parentPath, name);
			knownItems[completePath] = item;
		}
		
		return item;
	}
}

let knownItems = {};
