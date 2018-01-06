const path = require('path');
const fs = require('fs');
const os = require('os');
const childProcess = require('child_process');

const moment = require('moment');
const trash = require('trash');
const rimraf = require('rimraf');

const TypeDefinition = require('./TypeDefinition');
const ItemUserPermissions = require('./ItemUserPermissions');
const ItemGroupPermissions = require('./ItemGroupPermissions');
const ItemOtherPermissions = require('./ItemOtherPermissions');
const SetMethod = require('./SetMethod');

class Item {
	constructor(parentPath, name) {
		this._parentPath = parentPath;
		this._name = name;
	}
	
	get exists() {}
	
	get path() {}
	
	get name() {
		return this._name;
	}
	
	set name(value) {
		const targetPath = this._parentPath + value + (this._isFolder ? '/' : '');
		
		// Feasibility checks
		if (value.indexOf('/') > -1) {
			throw Error(`Can't rename “${this.name}”: “${value}” is not a valid name`);
		}

		if (fs.existsSync(targetPath)) {
			throw Error(`Can't rename “${this.name}”: “${value}” already exists`);
		}

		// Rename filesystem item (and possibly throw)
		fs.renameSync(this.path, targetPath);
		
		// Update paths of all related items
		Item._registerItemPathChange(this, targetPath);
	}
	
	get bareName() {
		const lastDotIndex = this.name.lastIndexOf('.');
		
		if (lastDotIndex === -1) {
			return this.name;
		} else {
			return this.name.slice(0, lastDotIndex);
		}
	}
	
	set bareName(value) {
		const currentBareName = this.bareName;
		
		this.name = value + this.name.slice(currentBareName.length);
	}
	
	get size() {}
	
	get parent() {
		return this._isRoot ? null : Item._itemForPath(this._parentPath);
	}
	
	set parent(value) {
		this.moveTo(value);
	}
	
	get dateCreated() {
		return moment(this._stats.birthtime);
	}
	
	set dateCreated(value) {
		const momentDate = moment(value);
		const formattedDate = momentDate.format('MM/DD/YY HH:mm:ss'); // ewwww
		
		try {
			childProcess.execSync(`SetFile -d '${formattedDate}' ${this.path}`);
		} catch (error) {
			if (error.message.indexOf('error: invalid active developer path') > -1) {
				throw Error(`Can't redate “${this.name}”: command line tools are not installed. Please run \`xcode-select --install\` (macOS only).`);
			} else {
				throw error;
			}
		}
	}
	
	get dateModified() {
		return moment(this._stats.mtime);
	}
	
	set dateModified(value) {
		const momentDate = moment(value);
		const formattedDate = momentDate.format('YYYYMMDDHHmm.ss');
		
		childProcess.execSync(`touch -ht ${formattedDate} ${this.path}`);
	}
	
	get user() {
		return new ItemUserPermissions(this);
	}
	
	get group() {
		return new ItemGroupPermissions(this);
	}
	
	get other() {
		return new ItemOtherPermissions(this);
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
		const targetPath = destination.path + this.name + (this._isFolder ? '/' : '');
		
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
		Item._registerItemPathChange(this, targetPath);
		
		return this;
	}
	
	copyTo(destination, forgiving) {
		const targetPath = destination.path + this.name + (this._isFolder ? '/' : '');
		
		// Feasibility checks
		if (!(destination instanceof require('./Folder'))) {
			throw Error(`Can't copy “${this.name}”: destination is not a folder`);
		}
		
		if (fs.existsSync(targetPath)) {
			throw Error(`Can't copy “${this.name}”: target already exists`);
		}
		
		// Create parents if necessary
		if (forgiving) Item._makeParentHierarchy(targetPath);

		// Copy filesystem item (and possibly throw)
		Item._recursivelyCopyItem(this.path, targetPath);
		
		return Item._itemForPath(targetPath);
	}
	
	duplicate(newName) {
		let targetPath;
		
		// Settle on name
		if (!newName) {
			const currentExtension = /((\.[^.]+)?)$/.exec(this.name)[1];
			const currentBasename = this.name.slice(0, -currentExtension.length || undefined);
			newName = `${currentBasename} copy${currentExtension}`;
			
			let nameSuffix = 2;
			while (fs.existsSync(this._parentPath + newName)) {
				newName = `${currentBasename} copy ${nameSuffix}${currentExtension}`;
				nameSuffix++;
			}
			
			if (this._isFolder) newName += '/';
		}
		
		targetPath = this._parentPath + newName;
		
		// Feasibility checks
		if ((newName.slice(-1) === '/') !== this._isFolder) {
			throw Error(`Can't duplicate “${this.name}” to “${newName}”: newName is of the wrong type`);
		}

		if (fs.existsSync(targetPath)) {
			throw Error(`Can't duplicate “${this.name}” to “${newName}”: item already exists`);
		}

		// Copy filesystem item (and possibly throw)
		Item._recursivelyCopyItem(this.path, targetPath);
		
		return Item._itemForPath(targetPath);
	}
	
	delete(immediately) {
		if (!immediately) {
			const temporaryTrashPath = fs.mkdtempSync(os.tmpdir() + path.sep);
			const targetTemporaryPath = path.join(temporaryTrashPath, this.name);
			
			fs.renameSync(this.path, targetTemporaryPath);
			trash(targetTemporaryPath);
		} else {
			rimraf.sync(this.path);
		}
		
		return this;
	}
	
	get _isRoot() {
		return this.name === '';
	}
	
	get _isFolder() {
		return (this instanceof require('./Folder'));
	}
	
	get _stats() {
		return fs.lstatSync(this.path);
	}
	
	_make() {}
	
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
		
	static _registerItemPathChange(item, newItemPath) {
		const initialItemPath = item.path;
		const initialItemPathLength = initialItemPath.length;
		
		const knownItemPaths = Object.keys(Item._itemsByPath);
	
		knownItemPaths.forEach(knownItemPath => {
			const isRelated = item._isFolder ?
				knownItemPath.slice(0, initialItemPathLength) === initialItemPath :
				knownItemPath === initialItemPath;
		
			if (isRelated) {
				const newRelatedItemPath = newItemPath + knownItemPath.slice(initialItemPathLength);
				
				const newRelatedItemParentPath = path.dirname(newRelatedItemPath) + '/';
				const newRelatedItemName = newRelatedItemPath.slice(newRelatedItemParentPath.length);
			
				for (let relatedItem of Item._itemsByPath[knownItemPath].values()) {
					Item._deregisterItem(relatedItem);
					relatedItem._parentPath = newRelatedItemParentPath;
					relatedItem._name = newRelatedItemName;
					Item._registerItem(relatedItem);
				};
			}
		});
	}
	
	static _makeParentHierarchy(itemPath) {
		const parentPath = path.dirname(itemPath);
		if (!fs.existsSync(parentPath)) {
			this._makeParentHierarchy(parentPath);
			fs.mkdirSync(parentPath);
		}
	}
	
	static _recursivelyCopyItem(itemPath, targetPath) {
		const itemStats = fs.statSync(itemPath);
		if (itemStats.isDirectory()) {
			// Create folder
			fs.mkdirSync(targetPath, {mode: itemStats.mode});
			
			// Copy children
			return fs.readdirSync(itemPath).forEach(childName => {
				const childPath = path.join(itemPath, childName);
				const childTargetPath = path.join(targetPath, childName);
				Item._recursivelyCopyItem(childPath, childTargetPath);
			});
		} else {
			fs.copyFileSync(itemPath, targetPath);
		}
	}
}

Item.prototype.set = SetMethod;

Item._itemsByPath = {};

module.exports = Item;

Item[TypeDefinition.symbol] = value => Item._itemForPath(value);
