// v2

module.exports = {
	async importModuleAtPath(path) {
		return await import(path);
	},
	requireModuleAtPath(path) {
		return require(path);
	}
};
