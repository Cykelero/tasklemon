/* Loads injectable modules into a given scope (normally, the global scope of a TL script). */

const injectableModuleNames = [
	'root',
	'home',
	'here',
	'scriptFile',
	'scriptFolder',
	
	'cli',
	'format',
	'net',
	'moment',
	'npm',
	
	'Item',
	'File',
	'Folder'
];

module.exports = function(scope) {
	injectableModuleNames.forEach(injectableModuleName => {
		Object.defineProperty(scope, injectableModuleName, {
			get() {
				return require(`./exposed-modules/injected/${injectableModuleName}`);
			}
		});
	});
};
