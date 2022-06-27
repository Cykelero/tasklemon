// v1

module.exports = {
	async importModuleAtPath(path) {
		try {
			return await import(path);
		} catch(e) {
			return null;
		}
	},
	requireModuleAtPath(path) {
		try {
			return require(path);
		} catch(e) {
			return null;
		}
	}
};
