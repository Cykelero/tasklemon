const childProcess = require('child_process');

beforeEach(function() {
	this.execFileSync = function() {
		return childProcess.execFileSync.apply(this, arguments).toString();
	};
});
