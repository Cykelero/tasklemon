describe('npm', function() {
	let testEnv;

	beforeEach(function() {
		testEnv = this.getTestEnv();
	});
	
	it('should expose the default export of named ESM packages', async function() {
		const scriptSource = `
			const uniqueCount = npm['array-union']([1, 2], [2, 3]).length;
			process.stdout.write(String(uniqueCount));
		`;
		
		let scriptOutput = await testEnv.runLemonScript(scriptSource);
		
		expect(scriptOutput).toBe('3');
	});
	
	it('should expose the named exports of named ESM packages', async function() {
		const scriptSource = `
			const yes = npm['ts-extras'].isDefined(true);
			const no = npm['ts-extras'].isDefined(undefined);
			
			if (yes && !no) {
				process.stdout.write('success');
			}
		`;
		
		let scriptOutput = await testEnv.runLemonScript(scriptSource);
		
		expect(scriptOutput).toBe('success');
	});
	
	it('should expose the exports of CommonJS packages', async function() {
		const scriptSource = `
			const uniqueCount = npm.dedupe([1, 2, 2, 3]).length;
			process.stdout.write(String(uniqueCount));
		`;
		
		let scriptOutput = await testEnv.runLemonScript(scriptSource);
		
		expect(scriptOutput).toBe('3');
	});
	
	it('should expose scoped packages', async function() {
		const scriptSource = `// tl:require: @stryker-mutator/core@4.6.0
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
	
	it('should expose nested ESM exports', async function() {
		const scriptSource = `
			const Api = npm['telegram:tl:index.js'].Api;
			
			if ('Message' in Api) {
				process.stdout.write('success');
			}
		`;
		
		let scriptOutput = await testEnv.runLemonScript(scriptSource);
		
		expect(scriptOutput).toBe('success');
	});

	it('should expose nested CommonJS exports', async function() {
		const scriptSource = `// tl:require: uuid@3.3.0
			const uuid_v1 = npm['uuid:v1'];
			const uuid_v4 = npm['uuid:v4'];

			if (uuid_v1().length === 36 && uuid_v4().length === 36) {
				process.stdout.write('success');
			}
		`;
		
		let scriptOutput = await testEnv.runLemonScript(scriptSource);
		
		expect(scriptOutput).toBe('success');
	});

	describe('(pre-0.3)', function() {
		it('should allow require-access to sub files', async function() {
			const scriptSource = `#version 0.2.3
#require uuid@3.3.0
				const uuid_v1 = npm['uuid/v1'];
				const uuid_v4 = npm['uuid/v4'];
				
				if (uuid_v1().length === 36 && uuid_v4().length === 36) {
					process.stdout.write('success');
				}
			`;
			
			let scriptOutput = await testEnv.runLemonScript(scriptSource, [], ['--no-pin']);
			
			expect(scriptOutput).toBe('success');
		});
	});
});
