/* A method for setting multiple properties at once. */

module.exports = function(pairs) {
	Object.keys(pairs).forEach(key => {
		this[key] = pairs[key];
	});
	
	return this;
};
