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

	it('should allow require-access to sub files', async function() {
		const scriptSource = `#require uuid@3.3.0
			const uuid_v1 = npm['uuid:v1'];
			const uuid_v4 = npm['uuid:v4'];

			here.file('output.json').make(true).content = {
				v1: uuid_v1.toString(),
				v4: uuid_v4.toString()
			};
		`;

		await testEnv.runLemonScript(scriptSource);

		const outputPath = testEnv.nativePathFor('output.json');
		let value = JSON.parse(fs.readFileSync(outputPath));
		expect(value.v1).toContain('function v1');
		expect(value.v4).toContain('function v4');
	});

	describe('(pre-0.3)', function() {
		it('should allow require-access to sub files', async function() {
			const scriptSource = `#version 0.2.3
#require uuid@3.3.0
				const uuid_v1 = npm['uuid/v1'];
				const uuid_v4 = npm['uuid/v4'];
	
				here.file('output.json').make(true).content = {
					v1: uuid_v1.toString(),
					v4: uuid_v4.toString()
				};
			`;
	
			await testEnv.runLemonScript(scriptSource);
	
			const outputPath = testEnv.nativePathFor('output.json');
			let value = JSON.parse(fs.readFileSync(outputPath));
			expect(value.v1).toContain('function v1');
			expect(value.v4).toContain('function v4');
		});
	});
});
