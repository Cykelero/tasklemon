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
	
	get path() {
		return path.join(this._parentPath, this._name);
	}

	get size() {
		return this._stats.size;
	}
	
	get content() {
		return fs.readFileSync(this.path, {encoding: 'utf8'});
	}
	
	set content(value) {
		fs.writeFileSync(this.path, this._stringify(value));
	}
	
	get md5() {
		return md5File.sync(this.path);
	}
	
	getContentAs(type) {
		const castResult = TypeDefinition.execute(type, this.content);
		return castResult.valid ? castResult.value : null;
	}
	
	appendLine(value) {
		fs.appendFileSync(this.path, '\n' + this._stringify(value));
	}
	
	prependLine(value) {
		const existingContentBuffer = fs.readFileSync(this.path);
		
		fs.writeFileSync(this.path, this._stringify(value) + '\n');
		fs.appendFileSync(this.path, existingContentBuffer);
	}
	
	clear(forgiving) {
		if (!forgiving && !this.exists) {
			throw new Error(`Can't clear “${this.name}”: does not exist in “${this.parent.path}”`);
		}
		
		fs.writeFileSync(this.path, '');
	}
	
	_make(forgiving) {
		fs.closeSync(fs.openSync(this.path, 'a'));
	}
	
	_stringify(value) {
		return (typeof(value) === 'string') ? value : JSON.stringify(value);
	}
}

module.exports = File;

File[TypeDefinition.symbol] = function(value) {
	if (value.slice(-1) === '/') {
		throw 'is not a file';
	}
	
	return Item._itemForPath(value);
};
