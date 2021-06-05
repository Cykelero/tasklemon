/* Exposes the active runtime version, as requested by the user, or by the script. */

const Constants = require('./Constants');
const ScriptEnvironment = require('./ScriptEnvironment');

module.exports = {
	get stringValue() {
		return process.env.TASKLEMON_RUNTIME_VERSION
			|| ScriptEnvironment.requiredRuntimeVersion
			|| Constants.WIDE_RUNTIME_VERSION_SPECIFIER;
	},
	
	isLowerThan(referenceString) {
		const active = this._parseVersionString(this.stringValue);
		const reference = this._parseVersionString(referenceString);
		
		return active.major < reference.major
			|| active.minor < reference.minor;
	},
	
	_parseVersionString(versionString) {
		const versionParts = versionString.split('.');
		
		return {
			major: Number(versionParts[0]),
			minor: Number(versionParts[1] ?? '0')
		};
	}
};
