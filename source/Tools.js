module.exports = {
	exitWithError(message) {
		process.stdout.write(message + '\n');
		process.exit(1);
	},
	
	parseNodeError(error) {
		const errorParts = /Error: (.+), /.exec(error.toString());
		return errorParts ? errorParts[1] : error.message;
	}
};
