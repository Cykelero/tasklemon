/* Exposes the Folder class, only for use with the typeof operator. */

const Folder = require('../Folder');

module.exports = new Proxy(Folder, {
	construct() {
		throw new Error('You cannot instantiate this class directly. To obtain a reference to a folder, start with an entry point global: `root`, `home`, `here`, `scriptFile` or `scriptFolder`.')
	}
});
