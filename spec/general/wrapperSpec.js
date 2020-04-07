const fs = require('fs');

describe('The wrapper', function() {
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
			methodThatDoesNotExist();
		`;
		
		const scriptRunError = await testEnv.runLemonScript(scriptSource)
			.catch(error => error);
		
		expect(scriptRunError).toContain('ReferenceError: methodThatDoesNotExist is not defined');
	});
});
