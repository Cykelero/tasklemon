const path = require('path');
const fs = require('fs');

const Tools = require('./Tools');

module.exports = class Script {
	// Exposed
	constructor(scriptPath) {
		this.path = scriptPath;
	}
	
	get name() {
		return path.basename(this.path);
	}
	
	get source() {
		return Tools.readFileOrExitWithErrorSync(
			this.path,
			{ encoding: 'utf8' },
			`Couldn't read “${this.name}” because of error: “$0”`
		);
	}
	
	set source(value) {
		return Tools.writeFileOrExitWithErrorSync(
			this.path,
			value,
			{ encoding: 'utf8' },
			`Couldn't write “${this.name}” because of error: “$0”`
		);
	}
	
	setSourceOrThrow(value) {
		fs.writeFileSync(this.path, value, { encoding: 'utf8' });
	}
};
