const path = require('path');
const os = require('os');

module.exports = {
	CACHE_PATH: path.join(os.homedir(), '.cache', 'tasklemon', path.sep)
};
