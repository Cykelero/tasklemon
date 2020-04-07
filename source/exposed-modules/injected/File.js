/* Exposes the File class, only for use with the typeof operator. */

const File = require('../File');

module.exports = new Proxy(File, {
	construct() {
		throw new Error('You cannot instantiate this class directly. To obtain a reference to a file, start with an entry point: `root`, `home` or `here`.')
	}
});
