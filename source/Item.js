/* Represents an item on disk; exposes and allow changing its data and metadata. Needs subclassing to define the type of the item. */

const path = require('path');
const fs = require('fs');
const os = require('os');
const childProcess = require('child_process');
const isPosix = process.platform !== 'win32';

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
	
	get path() {
		return Item._toCleanPath(this._path);
	}
	
	get name() {
		return this._name;
	}
	
	set name(value) {
		this._throwIfNonexistent(`set name of`);
		
		const targetPath = this._parentPath + value + (this._isFolder ? path.sep : '');
		
		if (value === this.name) return;
		
		// Feasibility checks
		if (value.indexOf('/') > -1) {
			throw Error(`Can't rename “${this.name}”: “${value}” is not a valid name (contains a slash)`);
		}

		if (fs.existsSync(targetPath)) {
			throw Error(`Can't rename “${this.name}”: “${value}” already exists`);
		}

		// Rename filesystem item (and possibly throw)
		fs.renameSync(this._path, targetPath);
		
		// Update paths of all related items
		Item._registerItemPathChange(this, targetPath);
	}
	
	get bareName() {
		const lastDotIndex = this.name.lastIndexOf('.');
		
		if (lastDotIndex < 1) {
			return this.name;
		} else {
			return this.name.slice(0, lastDotIndex);
		}
	}
	
	set bareName(value) {
		const currentBareName = this.bareName;
		
		this.name = value + this.name.slice(currentBareName.length);
	}
	
	get extension() {
		const lastDotIndex = this.name.lastIndexOf('.');
		
		if (lastDotIndex < 1) {
			return '';
		} else {
			return this.name.slice(lastDotIndex + 1);
		}
	}
	
	set extension(value) {
		if (value === '') {
			this.name = this.bareName;
		} else {
			this.name = `${this.bareName}.${value}`;
		}
	}
	
	get size() {}
	
	get parent() {
		return this._isRoot ? null : Item._itemForPath(this._parentPath);
	}
	
	set parent(value) {
		this._throwIfNonexistent(`move`);
		this.moveTo(value);
	}
	
	get dateCreated() {
		this._throwIfNonexistent(`get creation date of`);
		return moment(this._stats.birthtime);
	}
	
	set dateCreated(value) {
		this._throwIfNonexistent(`set creation date of`);
		
		if (process.platform !== 'darwin') {
			throw Error(`Can't set creation date of “${this.name}”: operation is only supported on macOS`);
		}
		
		const momentDate = moment(value);
		const formattedDate = momentDate.format('MM/DD/YY HH:mm:ss'); // ewwww
		
		try {
			childProcess.execFileSync('SetFile', ['-d', formattedDate, this._path]);
		} catch (error) {
			if (error.message.indexOf('error: invalid active developer path') > -1) {
				throw Error(`Can't set creation date of “${this.name}”: command line tools are not installed. Please run \`xcode-select --install\``);
			} else {
				throw error;
			}
		}
	}
	
	get dateModified() {
		this._throwIfNonexistent(`get modification date of`);
		return moment(this._stats.mtime);
	}
	
	set dateModified(value) {
		this._throwIfNonexistent(`set modification date of`);
		
		const momentDate = moment(value);
		const formattedDate = momentDate.format('YYYYMMDDHHmm.ss');
		
		childProcess.execFileSync('touch', ['-ht', formattedDate, this._path]);
	}
	
	get user() {
		this._throwIfNonexistent(`get user permissions of`);
		return new ItemUserPermissions(this);
	}
	
	get group() {
		this._throwIfNonexistent(`get group permissions of`);
		return new ItemGroupPermissions(this);
	}
	
	get other() {
		this._throwIfNonexistent(`get other permissions of`);
		return new ItemOtherPermissions(this);
	}
	
	make(forgiving) {
		// Fail or abort if item exists
		if (fs.existsSync(this._path)) {
			if (!forgiving) {
				if (!this._isRoot) {
					throw new Error(`Can't make “${this.name}”: already exists in “${this.parent.path}”`);
				} else {
					throw new Error(`Can't make “${this.path}”: already exists`);
				}
			} else if (this.exists) {
				return this;
			} else {
				throw new Error(`Can't make “${this.name}”: non-${this._typeName} already exists in “${this.parent.path}”`);
			}
		}
		
		// If forgiving, create parents if necessary
		if (forgiving) Item._makeParentHierarchy(this._path);
		
		// Create item
		this._make(forgiving);
		
		return this;
	}
	
	moveTo(destination, forgiving) {
		this._throwIfNonexistent(`move`);
		
		const targetPath = destination._path + this.name + (this._isFolder ? path.sep : '');
		
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
		fs.renameSync(this._path, targetPath);
		
		// Update paths of all related items
		Item._registerItemPathChange(this, targetPath);
		
		return this;
	}
	
	copyTo(destination, forgiving) {
		this._throwIfNonexistent(`copy`);
		
		const targetPath = destination._path + this.name + (this._isFolder ? path.sep : '');
		
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
		Item._recursivelyCopyItem(this._path, targetPath);
		
		return Item._itemForPath(targetPath);
	}
	
	duplicate(newName) {
		this._throwIfNonexistent(`duplicate`);
		
		let targetPath;
		
		// Settle on name
		if (!newName) {
			const extension = this.extension ? ('.' + this.extension) : '';
			newName = `${this.bareName} copy${extension}`;
			
			let nameSuffix = 2;
			while (fs.existsSync(this._parentPath + newName)) {
				newName = `${this.bareName} copy ${nameSuffix}${extension}`;
				nameSuffix++;
			}
		}
		
		targetPath = this._parentPath + newName + (this._isFolder ? path.sep : '');
		
		// Feasibility checks
		if (newName.indexOf('/') > -1) {
			throw Error(`Can't duplicate “${this.name}”: “${value}” is not a valid name (contains a slash)`);
		}

		if (fs.existsSync(targetPath)) {
			throw Error(`Can't duplicate “${this.name}” to “${newName}”: ${this._typeName} already exists`);
		}

		// Copy filesystem item (and possibly throw)
		Item._recursivelyCopyItem(this._path, targetPath);
		
		return Item._itemForPath(targetPath);
	}
	
	delete(immediately) {
		this._throwIfNonexistent(`delete`);
		
		Item._deleteItem(this._path, immediately);
		
		return this;
	}
	
	equals(other) {
		if (!other) return false;
		
		return other._isFolder === this._isFolder
			&& other._parentPath === this._parentPath
			&& other._name === this._name;
	}
	
	get _path() {}
	
	get _isRoot() {
		return this.name === '';
	}
	
	get _isFolder() {
		return (this instanceof require('./Folder'));
	}
	
	get _typeName() {
		return this._isFolder ? 'folder' : 'file';
	}
	
	get _stats() {
		return fs.lstatSync(this._path);
	}

	_throwIfNonexistent(actionDescription) {
		if (!this.exists) {
			throw Error(`Can't ${actionDescription} “${this.name}”: ${this._typeName} does not exist`);
		}
	}
	
	_make() {}

	static _toCleanPath(nativePath) {
		return nativePath.split(path.sep).join('/');
	}

	static _toNativePath(cleanPath) {
		return cleanPath.split('/').join(path.sep);
	}
	
	static _itemForPath(inputPath, detectTypeFromFilesystem) {
		let normalizedInputPath;
		let isFolder;
		let name;
		let parentPath;
		
		// Normalize path
		normalizedInputPath = path.normalize(inputPath);
		
		// // Windows: Add drive identifier
		if (!isPosix && normalizedInputPath[0] === path.sep) {
			const driveIdentifier = /[^\\]+/.exec(process.cwd())[0];
			normalizedInputPath = driveIdentifier + normalizedInputPath;
		}
		
		// // Make absolute
		const isAbsolute = isPosix
			? normalizedInputPath[0] === path.sep
			: /^\w+:\\/.test(normalizedInputPath);
		
		if (!isAbsolute) {
			// Prepend current working directory
			normalizedInputPath = path.join(process.cwd(), normalizedInputPath);
		}
		
		// Get info from path
		name = path.basename(normalizedInputPath);
		parentPath = Item._realParentPathForPath(normalizedInputPath);
		
		// Decide if item is folder or not
		if (detectTypeFromFilesystem) {
			// Look at filesystem
			const isFile = this._isActualItemAFile(normalizedInputPath);
			if (isFile === null) return null;
			
			isFolder = !isFile;
		} else {
			// Look at input path
			const lastInputPathComponent = path.basename(inputPath);
			isFolder = (normalizedInputPath.slice(-1) === path.sep)
				|| lastInputPathComponent === '.'
				|| lastInputPathComponent === '..';
		}
		
		// Create item instance
		const itemClass = isFolder ? require('./Folder') : require('./File');
		let itemInstance = new itemClass(parentPath, name);
		Item._registerItem(itemInstance, parentPath);
		
		return itemInstance;
	}
	
	static _realParentPathForPath(inputPath) {
		let parentPathExistent = path.dirname(inputPath);
		let parentPathNonexistent = '';
		let resolvedParentPathExistent = null;
		
		while (resolvedParentPathExistent === null) {
			try {
				resolvedParentPathExistent = fs.realpathSync(parentPathExistent + path.sep);
				if (resolvedParentPathExistent.slice(-1) === path.sep) {
					resolvedParentPathExistent = resolvedParentPathExistent.slice(0, -1);
				}
			} catch (e) {
				const lastPathPiece = path.basename(parentPathExistent);
				parentPathExistent = parentPathExistent.slice(0, -lastPathPiece.length - 1);
				parentPathNonexistent = path.sep + lastPathPiece + parentPathNonexistent;
			}

			if (parentPathExistent === '') {
				resolvedParentPathExistent = '';
			}
		}
		
		
		return resolvedParentPathExistent + parentPathNonexistent + path.sep;
	}
	
	static _isActualItemAFile(path) {
		try {
			return fs.lstatSync(path).isFile();
		} catch (e) {
			return null;
		}
	}
	
	static _registerItem(item) {
		const itemPath = item._path;
		if (!Item._itemsByPath[itemPath]) Item._itemsByPath[itemPath] = new Set();
		
		Item._itemsByPath[itemPath].add(item);
	}
	
	static _deregisterItem(item) {
		const itemPath = item._path;
		Item._itemsByPath[itemPath].delete(item);
	}
		
	static _registerItemPathChange(item, newItemPath) {
		const initialItemPath = item._path;
		const initialItemPathLength = initialItemPath.length;
		
		const knownItemPaths = Object.keys(Item._itemsByPath);
	
		knownItemPaths.forEach(knownItemPath => {
			const isRelated = item._isFolder ?
				knownItemPath.slice(0, initialItemPathLength) === initialItemPath :
				knownItemPath === initialItemPath;
		
			if (isRelated) {
				const newRelatedItemPath = newItemPath + knownItemPath.slice(initialItemPathLength);
				
				const newRelatedItemParentPath = path.dirname(newRelatedItemPath) + path.sep;
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
	
	static _deleteItem(itemPath, immediately) {
		if (!immediately) {
			const temporaryTrashPath = fs.mkdtempSync(os.tmpdir() + path.sep);
			const targetTemporaryPath = path.join(temporaryTrashPath, path.basename(itemPath));

			fs.renameSync(itemPath, targetTemporaryPath);
			trash(targetTemporaryPath);
		} else {
			rimraf.sync(itemPath);
		}
	}
}

Item.prototype.set = SetMethod;

Item._itemsByPath = {};

module.exports = Item;

Item[TypeDefinition.symbol] = function(value) {
	const item = Item._itemForPath(value, true);
	
	if (!item) throw 'is not a path to an existing item';
	
	return item;
};
