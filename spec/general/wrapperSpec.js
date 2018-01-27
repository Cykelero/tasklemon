const fs = require('fs');

describe('The wrapper', function() {
	let testEnv;
	
	beforeEach(function() {
		testEnv = this.getTestEnv();
	});
	
	it('should run the script', function() {
		testEnv.runLemonScript(`
			const fs = require('fs');
			fs.closeSync(fs.openSync('did-run', 'w'));
		`);
		
		const didRunPath = testEnv.nativePathFor('did-run');
		expect(fs.existsSync(didRunPath)).toBe(true);
	});
});
