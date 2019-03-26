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
		try {
			return fs.readFileSync(this.path, {encoding: 'utf8'});
		} catch (error) {
			const parsedError = Tools.parseNodeError(error);
			Tools.exitWithError(`Couldn't read “${this.name}” because of error: “${parsedError}”.`);
		}
	}
};
