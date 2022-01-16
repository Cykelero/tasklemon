const InjectedFolder = require('../../source/exposed-modules/injected/Folder');

describe('Folder (injected)', function() {
	let testEnv;
	
	beforeEach(function() {
		testEnv = this.getTestEnv();
	});
	
	describe('()', function() {
		it('should accept an absolute path', function() {
			const folderPath = testEnv.createFolder('folder');
			const nativeFolderPath = this.toNativePath(folderPath);
			
			const folderItem = InjectedFolder(nativeFolderPath);
			
			expect(folderItem instanceof InjectedFolder).toBe(true);
			expect(folderItem.path).toBe(folderPath);
		});

		it('should fail if passed a relative path', function() {
			const folderPath = 'folder/';
			const nativeFolderPath = this.toNativePath(folderPath);
			
			expect(() => InjectedFolder(nativeFolderPath)).toThrow();
		});
	});
});
