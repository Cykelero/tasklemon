/* Allows loading npm packages, relying on the package cache. */

const ScriptEnvironment = require('../../ScriptEnvironment');
const PackageCache = require('../../PackageCache');

module.exports = new Proxy({}, {
	get(target, property) {
		return proxyForModule(property);
	}
});

function proxyForModule(importPath) {
	const esmExports = PackageCache.getModuleESMExports(importPath);
	let commonJSExports;
	
	function getCommonJSExports() {
		// Load CommonJS exports on demand, since the load can have side-effects
		if (!commonJSExports) {
			commonJSExports = PackageCache.getModuleCommonJSExports(
				importPath,
				ScriptEnvironment.defaultBundlePackageList,
				ScriptEnvironment.requiredPackageVersions
			);
		}
		
		return commonJSExports;
	}
	
	const proxyTarget = esmExports
		? esmExports.default || {}
		: getCommonJSExports();
	
	return new Proxy(proxyTarget, {
		get(target, property) {
			if (property === 'unmodifiedDefaultExport') {
				// Return unmodified default ESM export or CommonJS exports
				return target;
			} else if (esmExports && property in esmExports) {
				// Return named ESM export
				return esmExports[property];
			} else if (esmExports && 'default' in esmExports) {
				// Return property of default ESM export
				return bindProperty(esmExports.default, property);
			} else {
				// Return property of CommonJS exports
				return bindProperty(getCommonJSExports(), property);
			}
		}
	});
}

function bindProperty(object, property) {
	if (typeof property === 'function') {
		return object[property].bind(object);
	} else {
		return object[property];
	}
}
