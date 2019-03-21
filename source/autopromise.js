const util = require('util');

module.exports = (callbackModule) => new Proxy(callbackModule, {
	get(callbackModule, methodName) {
		if (!this.promisifyMethodCache[methodName]) {
			this.promisifyMethodCache[methodName] = util.promisify(callbackModule[methodName]);
		}
		
		return this.promisifyMethodCache[methodName];
	},
	promisifyMethodCache: {}
});
