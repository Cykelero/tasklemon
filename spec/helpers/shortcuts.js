const childProcess = require('child_process');

beforeEach(function() {
	this.execSync = function() {
		return childProcess.execSync.apply(this, arguments).toString();
	};
});
