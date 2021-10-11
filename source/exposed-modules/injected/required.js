/* Indicates that an argument is mandatory. */

const OmitBehavior = require('../OmitBehavior');

module.exports = function() {
	return new OmitBehavior('required');
};
