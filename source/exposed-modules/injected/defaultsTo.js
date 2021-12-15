/* Specifies a default value for an argument. */

const OmitBehavior = require('../../ArgumentParser/OmitBehavior');

module.exports = function(defaultValue) {
	return new OmitBehavior('defaultsTo', { defaultValue });
};
