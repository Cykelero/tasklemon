// v0

module.exports = function getPackage(path) {
	try {
		return require(path);
	} catch(e) {
		return null;
	}
};
