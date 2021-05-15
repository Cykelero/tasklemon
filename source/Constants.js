/* Tasklemon-wide constants. */

const path = require('path');
const os = require('os');
const isPosix = process.platform !== 'win32';

const RUNTIME_VERSION = require('../package.json').version;
const WIDE_RUNTIME_VERSION_SPECIFIER = RUNTIME_VERSION
	.split('.')
	.slice(0, 2)
	.join('.'); // e.g. 0.2; once 1.0.0 is reached, should be e.g. 1

module.exports = {
	TASKLEMON_PATH: path.join(__dirname, 'tasklemon.js'),
	RUNTIME_VERSION,
	WIDE_RUNTIME_VERSION_SPECIFIER,
	DEFAULT_SHEBANG: '/usr/bin/env tasklemon-v' + WIDE_RUNTIME_VERSION_SPECIFIER,
	CACHE_PATH: isPosix
		? path.join(os.homedir(), '.cache', 'tasklemon', path.sep)
		: path.join(process.env.APPDATA, 'tasklemon-cache', path.sep)
};
