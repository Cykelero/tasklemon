/* Indicates that an argument is mandatory. */

const OmitBehavior = require('../../ArgumentParser/OmitBehavior');

module.exports = function() {
	return new OmitBehavior('required');
};
