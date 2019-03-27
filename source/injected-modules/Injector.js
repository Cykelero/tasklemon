const moduleNames = ['root', 'home', 'here', 'cli', 'format', 'net', 'moment', 'npm', 'Item', 'File', 'Folder'];

module.exports = function(scope) {
	moduleNames.forEach(moduleName => {
		Object.defineProperty(scope, moduleName, { // use defineProperty to bypass `root` deprecation warning
			value: require(`./${moduleName}`)
		});
	});
};
