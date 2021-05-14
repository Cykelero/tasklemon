const ScriptParser = require('../../source/ScriptParser');

describe('ScriptParser', function() {
	let testEnv;
	
	beforeEach(function() {
		testEnv = this.getTestEnv();
	});
	
	describe('#requiredPackages', function() {
		it('should return detected packages', async function() {
			const scriptSource = `
cli.tell(npm.chalk.blue('Test string'));
cli.tell(npm['dedupe']([1, 2, 2, 3]));
cli.tell(await npm['username']());
			`;
			
			const scriptParser = new ScriptParser(scriptSource);
			
			expect(scriptParser.requiredPackages).toEqual(['chalk', 'dedupe', 'username']);
		});
		
		it('should return requested packages', async function() {
			const scriptSource = `
#require extract-iptc@0.1.3
#require username@5.0.0

cli.tell('Hello!');
			`;
			
			const scriptParser = new ScriptParser(scriptSource);
			
			expect(scriptParser.requiredPackages).toEqual(['extract-iptc', 'username']);
		});
	});
	
	describe('#requiredPackageVersions', function() {
		it('should expose requested package versions', async function() {
			const scriptSource = `
#require extract-iptc@0.1.3
#require username@5.0.0

cli.tell('Hello!');
			`;
			
			const scriptParser = new ScriptParser(scriptSource);
			
			expect(scriptParser.requiredPackageVersions).toEqual({
				'extract-iptc': '0.1.3',
				'username': '5.0.0'
			});
		});
	});
	
	describe('#pinRuntimeVersion', function() {
		it('should add shebang and runtime version headers', async function() {
			const scriptSource = `cli.tell('Hello!');` + '\n';
			
			const scriptParser = new ScriptParser(scriptSource);
			scriptParser.pinRuntimeVersion();
			
			expect(scriptParser.source).toMatch(
				new RegExp(
					`#!/usr/bin/env lemon` + '\\s+'
					+ `#version \\d.\\d` + '\\s+'
					+ '\\s+'
				)
			);
		});
	});
	
	describe('#pinPackageVersions', function() {
		it('should add require headers', async function() {
			const scriptSource = `
cli.tell(npm.chalk.blue('Test string'));
cli.tell(npm['dedupe']([1, 2, 2, 3]));
cli.tell(await npm['username']());
			`;
			
			const scriptParser = new ScriptParser(scriptSource);
			scriptParser.pinPackageVersions();
			
			expect(scriptParser.source).toMatch(
				new RegExp(
					'#require chalk@\\d.\\d.\\d' + '\\s+'
					+ '#require dedupe@\\d.\\d.\\d' + '\\s+'
					+ '#require username@\\d.\\d.\\d' + '\\s+'
				)
			);
		});
	});
});
