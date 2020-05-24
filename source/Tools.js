/* General-purpose methods. */

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
	
	tryOrExitWithError(callback, message) { /* eslint-disable-line consistent-return */
		try {
			return callback();
		} catch (error) {
			const messageWithError = message.replace('$0', this.parseNodeError(error));
			this.exitWithError(messageWithError);
		}
	},
	
	readFileOrExitWithErrorSync(filePath, options, message) {
		return this.tryOrExitWithError(() => {
			return fs.readFileSync(filePath, options);
		}, message);
	},
	
	writeFileOrExitWithErrorSync(filePath, fileContent, options, message) {
		return this.tryOrExitWithError(() => {
			return fs.writeFileSync(filePath, fileContent, options);
		}, message);
	},
	
	ensureFolderExistsOrExitWithErrorSync(folderPath, message) {
		const errorIsFolderExistsRegexp = /^EEXIST\b/;
		
		try {
			fs.mkdirSync(folderPath);
		} catch (error) {
			if (!errorIsFolderExistsRegexp.test(error.message)) {
				// Folder couldn't be created
				const messageWithError = message.replace('$0', this.parseNodeError(error));
				this.exitWithError(messageWithError);
			}
		}
	}
};
