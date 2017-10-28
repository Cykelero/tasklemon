let cli = module.exports;

cli.tell = function(text) {
	process.stdout.write(text + '\n');
};
