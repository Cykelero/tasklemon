// v0

module.exports = function getPackage(name) {
	try {
		return require(name);
	} catch(e) {
		return null;
	}
};
