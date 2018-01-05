module.exports = function(pairs) {
	Object.keys(pairs).forEach(key => {
		this[key] = pairs[key];
	});
};
