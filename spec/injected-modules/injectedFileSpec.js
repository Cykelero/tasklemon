const InjectedFile = require('../../source/exposed-modules/injected/File');

describe('File (injected)', function() {
	let testEnv;
	
	beforeEach(function() {
		testEnv = this.getTestEnv();
	});
	
	describe('()', function() {
		it('should accept an absolute path', function() {
			const filePath = testEnv.createFile('file');
			const nativeFilePath = this.toNativePath(filePath);
			
			const fileItem = InjectedFile(nativeFilePath);
			
			expect(fileItem instanceof InjectedFile).toBe(true);
			expect(fileItem.path).toBe(filePath);
		});

		it('should fail if passed a relative path', function() {
			const filePath = 'file';
			const nativeFilePath = this.toNativePath(filePath);
			
			expect(() => InjectedFile(nativeFilePath)).toThrow();
		});

		it('should fail if passed a folder path', function() {
			const folderPath = '/folder/';
			const nativeFolderPath = this.toNativePath(folderPath);
			
			expect(() => InjectedFile(nativeFolderPath)).toThrow();
		});
	});
});
