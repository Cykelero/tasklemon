/* Represents a file on disk; exposes and allow changing its data and metadata. */

const fs = require('fs');
const path = require('path');

const md5File = require('md5-file');

const Item = require('./Item');
const TypeDefinition = require('../TypeDefinition');

class File extends Item {
	get exists() {
		try {
			return this._stats.isFile();
		} catch (e) {
			return false;
		}
	}

	get size() {
		this._throwIfNonexistent(`get size of`);
		return this._stats.size;
	}
	
	get content() {
		this._throwIfNonexistent(`get content of`);
		return fs.readFileSync(this._path, {encoding: 'utf8'});
	}
	
	set content(value) {
		this._throwIfNonexistent(`set content of`);
		fs.writeFileSync(this._path, this._stringify(value));
	}
	
	get md5() {
		this._throwIfNonexistent(`get md5 hash of`);
		return md5File.sync(this._path);
	}
	
	getContentAs(type) {
		this._throwIfNonexistent(`get content of`);
		const castResult = TypeDefinition.execute(type, this.content);
		return castResult.valid ? castResult.value : null;
	}
	
	getContentAsJSON() {
		return this.getContentAs(Object);
	}
	
	appendLine(value, forgiving) {
		if (!forgiving) this._throwIfNonexistent(`append line to`);
		fs.appendFileSync(this._path, this._stringify(value) + '\n');
		
		return this;
	}
	
	prependLine(value, forgiving) {
		let existingContentBuffer;
		
		if (this.exists) {
			existingContentBuffer = fs.readFileSync(this._path);
		} else if (!forgiving) {
			throw Error(`Can't prepend line to “${this.name}”: ${this._typeName} does not exist`);
		}
		
		fs.writeFileSync(this._path, this._stringify(value) + '\n');
		if (existingContentBuffer) fs.appendFileSync(this._path, existingContentBuffer);
		
		return this;
	}
	
	clear(forgiving) {
		if (!forgiving) this._throwIfNonexistent(`clear content of`);
		
		fs.writeFileSync(this._path, '');
		
		return this;
	}
	
	get _path() {
		return path.join(this._parentPath, this._name);
	}
	
	_make(forgiving) {
		fs.closeSync(fs.openSync(this._path, 'a'));
	}
	
	_stringify(value) {
		return (typeof(value) === 'string') ? value : JSON.stringify(value);
	}
}

module.exports = File;

File[TypeDefinition.symbol] = function(value) {
	if (value.slice(-1) === path.sep) {
		throw 'is not a path to a file';
	}
	
	return Item._itemForPath(value);
};
