describe('npm', function() {
	let testEnv;

	beforeEach(function() {
		testEnv = this.getTestEnv();
	});

	it('should install and run simply named packages', async function() {
		const scriptSource = `
			const uniqueCount = npm.dedupe([1, 2, 2, 3]).length;
			process.stdout.write(String(uniqueCount));
		`;
		
		let scriptOutput = await testEnv.runLemonScript(scriptSource);
		
		expect(scriptOutput).toBe('3');
	});

	it('should install and run scoped packages', async function() {
		const scriptSource = `
			const stryker = new npm['@stryker-mutator/core'].Stryker({ concurrency: 4 });
			process.stdout.write(String(stryker.cliOptions.concurrency));
		`;
		
		let scriptOutput = await testEnv.runLemonScript(scriptSource);
		
		expect(scriptOutput).toBe('4');
	});

	it('should recognize pinned versions for scoped packages', async function() {
		// The require header must be in column 0 of the script, thus the unusual formatting
		const scriptSource = `// tl:require: @octokit/core@3.2.4
			process.stdout.write(String(npm['@octokit/core'].Octokit.VERSION));
		`;
		
		let scriptOutput = await testEnv.runLemonScript(scriptSource);
		
		expect(scriptOutput).toBe('3.2.4');
	});

	it('should allow require-access to sub files', async function() {
		const scriptSource = `// tl:require: uuid@3.3.0
			const uuid_v1 = npm['uuid:v1'];
			const uuid_v4 = npm['uuid:v4'];

			process.stdout.write(JSON.stringify({
				v1: uuid_v1.toString(),
				v4: uuid_v4.toString()
			}));
		`;
		
		let scriptOutput = await testEnv.runLemonScript(scriptSource);
		
		let parsedScriptOutput = JSON.parse(scriptOutput);
		expect(parsedScriptOutput.v1).toContain('function v1');
		expect(parsedScriptOutput.v4).toContain('function v4');
	});

	describe('(pre-0.3)', function() {
		it('should allow require-access to sub files', async function() {
			const scriptSource = `#version 0.2.3
#require uuid@3.3.0
				const uuid_v1 = npm['uuid/v1'];
				const uuid_v4 = npm['uuid/v4'];
	
				process.stdout.write(JSON.stringify({
					v1: uuid_v1.toString(),
					v4: uuid_v4.toString()
				}));
			`;
			
			let scriptOutput = await testEnv.runLemonScript(scriptSource, [], ['--no-pin']);
			
			let parsedScriptOutput = JSON.parse(scriptOutput);
			expect(parsedScriptOutput.v1).toContain('function v1');
			expect(parsedScriptOutput.v4).toContain('function v4');
		});
	});
});
