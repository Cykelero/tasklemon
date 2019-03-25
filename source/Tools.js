module.exports = {
	exitWithError(message) {
		process.stdout.write(message + '\n');
		process.exit(1);
	}
};
