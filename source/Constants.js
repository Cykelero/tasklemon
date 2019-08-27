const path = require('path');
const os = require('os');
const isPosix = process.platform !== 'win32';

const RUNTIME_VERSION = require('../package.json').version;

module.exports = {
	RUNTIME_VERSION: RUNTIME_VERSION,
	WIDE_RUNTIME_VERSION_SPECIFIER: RUNTIME_VERSION.split('.').slice(0, 2).join('.'), // e.g. 0.2; once 1.0.0 is reached, should be e.g. 2
	DEFAULT_SHEBANG: '/usr/bin/env lemon',
	CACHE_PATH: isPosix
		? path.join(os.homedir(), '.cache', 'tasklemon', path.sep)
		: path.join(process.env.APPDATA, 'tasklemon-cache', path.sep)
};
