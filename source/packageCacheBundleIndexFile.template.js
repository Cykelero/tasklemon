// v0

module.exports = function getPackage(name) {
	try {
		return require(name.replace(':', '/'));
	} catch(e) {
		return null;
	}
};
