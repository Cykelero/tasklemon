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
		const reference = this._parseVersionString(referenceString, true);
		
		return active.major < reference.major
			|| active.minor < reference.minor;
	},
	
	isAtLeast(referenceString) {
		const active = this._parseVersionString(this.stringValue);
		const reference = this._parseVersionString(referenceString, true);
		
		return active.major > reference.major
			|| (
				active.major === reference.major
				&& active.minor >= reference.minor
			);
	},
	
	_parseVersionString(versionString, throwIfPatchSpecified) {
		const versionParts = versionString.split('.');
		
		if (throwIfPatchSpecified && versionParts[2] !== undefined) {
			throw new Error(`Patch version is not currently supported by RuntimeVersion`);
		}
		
		return {
			major: Number(versionParts[0]),
			minor: Number(versionParts[1] || '0')
		};
	}
};
