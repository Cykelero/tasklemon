const fs = require('fs');
const path = require('path');
const os = require('os');

const Item = require('../../source/exposed-modules/File');
const File = require('../../source/exposed-modules/File');
const Folder = require('../../source/exposed-modules/Folder');
const TypeDefinition = require('../../source/TypeDefinition');

const isPosix = os.platform() !== 'win32';
const driveId = isPosix ? '' : /[^\\]+/.exec(process.cwd())[0];

describe('Folder', function() {
	let testEnv;
	
	beforeEach(function() {
		testEnv = this.getTestEnv();
	});
	
	describe('TypeDefinition', function() {
		it('should accept a path', function() {
			const userPath = isPosix
				? 'parent-folder/folder'
				: 'parent-folder\\folder';
			
			const folder = TypeDefinition.execute(Folder, userPath);
			
			expect(folder.valid).toBeTruthy();
			expect(folder.value.path).toBe(path.posix.join(this.getCleanCWD(), 'parent-folder/folder/'));
		});
	});
	
	describe('#children', function() {
		it('should provide the list of the children of the folder', function() {
			const folderItem = this.itemForPath(testEnv.createFolder('folder/'));
			const childFileItem = this.itemForPath(testEnv.createFile('folder/childFile'));
			const childFolderItem = this.itemForPath(testEnv.createFolder('folder/childFolder/'));
			
			const children = folderItem.children.sort();
			
			expect(children.length).toBe(2);
			expect(children[0].path).toBe(childFileItem.path);
			expect(children[1].path).toBe(childFolderItem.path);
		});

		it('should exclude dotfiles', function() {
			const folderItem = this.itemForPath(testEnv.createFolder('folder/'));
			const childFileItem = this.itemForPath(testEnv.createFile('folder/.childFile'));
			
			const children = folderItem.children;
			
			expect(children.length).toBe(0);
		});
	});
	
	describe('file() and folder()', function() {
		it('should accept a starting slash only if self is root', function() {
			// Self is root
			const rootItem = Item._itemForPath('/');
			
			const rootChildItem = rootItem.folder('/opt/');
			
			expect(rootChildItem instanceof Folder).toBe(true);
			expect(rootChildItem.path).toBe(driveId + '/opt/');
			
			// Self is not root
			const nonRootItem = Item._itemForPath('/var/');
			
			expect(() => nonRootItem.folder('/opt/')).toThrow();
		});
	});
	
	describe('file()', function() {
		it('should return the child file', function() {
			const folderItem = this.itemForPath(testEnv.createFolder('folder/'));
			const childItemPath = testEnv.pathFor('folder/child');
			
			const returnedChildItem = folderItem.file('child');
			
			expect(returnedChildItem instanceof File).toBe(true);
			expect(returnedChildItem.path).toBe(childItemPath);
		});

		it('should fail if passed a folder path', function() {
			const folderItem = this.itemForPath(testEnv.createFolder('folder/'));
			
			expect(() => folderItem.file('child/')).toThrow();
		});
	});
	
	describe('folder()', function() {
		it('should return the child folder', function() {
			const folderItem = this.itemForPath(testEnv.createFolder('folder/'));
			const childItemPath = testEnv.pathFor('folder/child/');
			
			const returnedChildItem = folderItem.folder('child/');
			
			expect(returnedChildItem instanceof Folder).toBe(true);
			expect(returnedChildItem.path).toBe(childItemPath);
		});

		it('should fail if passed a file path', function() {
			const folderItem = this.itemForPath(testEnv.createFolder('folder/'));
			
			expect(() => folderItem.folder('child')).toThrow();
		});
	});
	
	describe('#glob()', function() {
		describe('{pattern}', function() {
			it('should return the children of the folder matching the pattern', function() {
				const folderItem = this.itemForPath(testEnv.createFolder('folder/'));
				const matchingChildItem = this.itemForPath(testEnv.createFile('folder/matching-child.txt'));
				this.itemForPath(testEnv.createFile('folder/ignored-child.md'));
			
				const returnedMatches = folderItem.glob('*.txt');
			
				expect(returnedMatches.length).toBe(1);
				expect(returnedMatches[0].path).toBe(matchingChildItem.path);
			});

			it('should be able to find matches in subfolders', function() {
				const folderItem = this.itemForPath(testEnv.createFolder('folder/'));
				this.itemForPath(testEnv.createFolder('folder/subfolder/'));
				const matchingChildItem = this.itemForPath(testEnv.createFile('folder/subfolder/matching-child.txt'));
			
				const returnedMatches = folderItem.glob('**/*.txt');
			
				expect(returnedMatches.length).toBe(1);
				expect(returnedMatches[0].path).toBe(matchingChildItem.path);
			});
		});

		describe('{pattern, options}', function() {
			it('should use the provided options when running the glob', function() {
				const folderItem = this.itemForPath(testEnv.createFolder('folder/'));
				const matchingChildItem = this.itemForPath(testEnv.createFile('folder/.matching-child.txt'));
			
				const returnedMatches = folderItem.glob('*.txt', {dot: true});
			
				expect(returnedMatches.length).toBe(1);
				expect(returnedMatches[0].path).toBe(matchingChildItem.path);
			});
		});
	});
	
	describe('empty()', function() {
		it('should remove all items from the folder', function() {
			const folderItem = this.itemForPath(testEnv.createFolder('folder/'));
			const childFileItem = this.itemForPath(testEnv.createFile('folder/childFile'));
			const childFolderItem = this.itemForPath(testEnv.createFolder('folder/childFolder/'));
			
			folderItem.empty();
			
			expect(folderItem.children.length).toBe(0);
		});
		
		describe('{immediately: true}', function() {
			it('should remove all items from the folder', function() {
				const folderItem = this.itemForPath(testEnv.createFolder('folder/'));
				const childFileItem = this.itemForPath(testEnv.createFile('folder/childFile'));
				const childFolderItem = this.itemForPath(testEnv.createFolder('folder/childFolder/'));
			
				folderItem.empty(true);
			
				expect(folderItem.children.length).toBe(0);
			});
		});

		it('should not remove the folder itself', function() {
			const folderItem = this.itemForPath(testEnv.createFolder('folder/'));
			
			folderItem.empty();

			expect(folderItem.exists).toBe(true);
		});
	});
});
