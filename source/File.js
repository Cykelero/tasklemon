const fs = require('fs');
const path = require('path');

const md5File = require('md5-file');

const Item = require('./Item');
const TypeDefinition = require('./TypeDefinition');

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
	
	appendLine(value) {
		this._throwIfNonexistent(`append line to`);
		fs.appendFileSync(this._path, '\n' + this._stringify(value));
	}
	
	prependLine(value) {
		this._throwIfNonexistent(`prepend line to`);
		
		const existingContentBuffer = fs.readFileSync(this._path);
		
		fs.writeFileSync(this._path, this._stringify(value) + '\n');
		fs.appendFileSync(this._path, existingContentBuffer);
	}
	
	clear(forgiving) {
		if (!forgiving) this._throwIfNonexistent(`clear content of`);
		
		fs.writeFileSync(this._path, '');
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
		throw 'is not a file';
	}
	
	return Item._itemForPath(value);
};
