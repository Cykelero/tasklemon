const fs = require('fs');

module.exports = {
	exitWithError(message) {
		process.stdout.write(message + '\n');
		process.exit(1);
	},
	
	parseNodeError(error) {
		const errorParts = /Error: (.+), /.exec(error.toString());
		return errorParts ? errorParts[1] : error.message;
	},
	
	readFileOrExitWithErrorSync(filePath, options, message) {
		try {
			return fs.readFileSync(filePath, options);
		} catch (error) {
			const messageWithError = message.replace('$0', this.parseNodeError(error));
			this.exitWithError(messageWithError);
		}
	},
	
	writeFileOrExitWithErrorSync(filePath, fileContent, options, message) {
		try {
			return fs.writeFileSync(filePath, fileContent, options);
		} catch (error) {
			const messageWithError = message.replace('$0', this.parseNodeError(error));
			this.exitWithError(messageWithError);
		}
	}
};
