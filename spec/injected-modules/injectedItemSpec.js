const InjectedItem = require('../../source/exposed-modules/injected/Item');
const InjectedFile = require('../../source/exposed-modules/injected/File');

describe('Item (injected)', function() {
	let testEnv;
	
	beforeEach(function() {
		testEnv = this.getTestEnv();
	});
	
	describe('()', function() {
		it('should accept an absolute path', function() {
			const filePath = testEnv.createFile('file');
			const nativeFilePath = this.toNativePath(filePath);
			
			const fileItem = InjectedItem(nativeFilePath);
			
			expect(fileItem instanceof InjectedFile).toBe(true);
			expect(fileItem.path).toBe(filePath);
		});

		it('should fail if passed a relative path', function() {
			const folderPath = './';
			const nativeFolderPath = this.toNativePath(folderPath);
			
			expect(() => InjectedItem(nativeFolderPath)).toThrow();
		});

		it('should fail if passed a non-existent path', function() {
			const filePath = '/non-existent/some-folder/some-file';
			const nativeFilePath = this.toNativePath(filePath);
			
			expect(() => InjectedItem(nativeFilePath)).toThrow();
		});
	});
});
