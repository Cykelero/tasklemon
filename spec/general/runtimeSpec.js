const fs = require('fs');

describe('The runtime', function() {
	let testEnv;
	
	beforeEach(function() {
		testEnv = this.getTestEnv();
	});
	
	it('should run scripts', async function() {
		const scriptSource = `
			const fs = require('fs');
			fs.closeSync(fs.openSync('did-run', 'w'));
		`;
		
		await testEnv.runLemonScript(scriptSource);
		
		const didRunPath = testEnv.nativePathFor('did-run');
		expect(fs.existsSync(didRunPath)).toBe(true);
	});
	
	it('should inject appropriate modules', async function() {
		const scriptSource = `
			const momentDate = moment();
		`;
		
		await testEnv.runLemonScript(scriptSource);
	});
	
	it('should expose errors thrown by scripts', async function() {
		const scriptSource = `
			functionThatDoesNotExist();
		`;
		
		const scriptRunError = await testEnv.runLemonScript(scriptSource)
			.catch(error => error);
		
		expect(scriptRunError.toString()).toContain('ReferenceError: functionThatDoesNotExist is not defined');
	});
});
