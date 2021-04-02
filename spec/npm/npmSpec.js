const fs = require('fs');

describe('npm', function() {
	let testEnv;

	beforeEach(function() {
		testEnv = this.getTestEnv();
	});

	it('should install and run simply named packages', async function() {
		const scriptSource = `
			const uniqueCount = npm.dedupe([1, 2, 2, 3]).length;
			here.file('output').make(true).content = uniqueCount;
		`;

		await testEnv.runLemonScript(scriptSource);

		const outputPath = testEnv.nativePathFor('output');
		let value = parseInt(fs.readFileSync(outputPath));
		expect(value).toBe(3);
	});

	it('should install and run scoped packages', async function() {
		const scriptSource = `
			const stryker = new npm['@stryker-mutator/core'].Stryker({ concurrency: 4 });
			here.file('output').make(true).content = stryker.cliOptions.concurrency;
		`;

		await testEnv.runLemonScript(scriptSource);

		const outputPath = testEnv.nativePathFor('output');
		let value = parseInt(fs.readFileSync(outputPath));
		expect(value).toBe(4);
	});

	it('should recognize pinned versions for scoped packages', async function() {
		// The #require must be in column 0 of the script, thus the unusual formatting
		const scriptSource = `#require @octokit/core@3.2.4
			here.file('output').make(true).content = npm['@octokit/core'].Octokit.VERSION;
		`;

		await testEnv.runLemonScript(scriptSource);

		const outputPath = testEnv.nativePathFor('output');
		let value = fs.readFileSync(outputPath).toString();
		expect(value).toBe('3.2.4');
	});
});
