const moduleNames = ['root', 'home', 'here', 'cli', 'format', 'net', 'moment', 'npm', 'Item', 'File', 'Folder'];

module.exports = function(scope) {
	moduleNames.forEach(moduleName => {
		Object.defineProperty(scope, moduleName, {
			get() {
				return require(`./${moduleName}`);
			}
		});
	});
};
