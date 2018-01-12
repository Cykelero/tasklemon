const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const Item = require('../../source/Item');
const File = require('../../source/File');
const Folder = require('../../source/Folder');

function execSync() {
	return childProcess.execSync.apply(this, arguments).toString();
}

describe('Folder', function() {
	let testEnv;
	
	beforeEach(function() {
		testEnv = this.getTestEnv();
	});
	
	describe('#children', function() {
		it('should provide the list of the children of the folder', function() {
			const folderItem = Item._itemForPath(testEnv.createFolder('folder/'));
			const childFileItem = Item._itemForPath(testEnv.createFile('folder/childFile'));
			const childFolderItem = Item._itemForPath(testEnv.createFolder('folder/childFolder/'));
			
			const children = folderItem.children.sort();
			
			expect(children.length).toBe(2);
			expect(children[0].path).toBe(childFileItem.path);
			expect(children[1].path).toBe(childFolderItem.path);
		});
	});
	
	describe('file() {path}', function() {
		it('should return the child file', function() {
			const folderItem = Item._itemForPath(testEnv.createFolder('folder/'));
			const childItemPath = testEnv.pathFor('folder/child');
			
			const returnedChildItem = folderItem.file('child');
			
			expect(returnedChildItem instanceof File).toBe(true);
			expect(returnedChildItem.path).toBe(childItemPath);
		});

		it('should fail if passed a folder path', function() {
			const folderItem = Item._itemForPath(testEnv.createFolder('folder/'));
			
			expect(() => folderItem.file('child/')).toThrow();
		});
	});
	
	describe('folder() {path}', function() {
		it('should return the child folder', function() {
			const folderItem = Item._itemForPath(testEnv.createFolder('folder/'));
			const childItemPath = testEnv.pathFor('folder/child/');
			
			const returnedChildItem = folderItem.folder('child/');
			
			expect(returnedChildItem instanceof Folder).toBe(true);
			expect(returnedChildItem.path).toBe(childItemPath);
		});

		it('should fail if passed a file path', function() {
			const folderItem = Item._itemForPath(testEnv.createFolder('folder/'));
			
			expect(() => folderItem.folder('child')).toThrow();
		});
	});
	
	describe('empty()', function() {
		it('should remove all items from the folder', function() {
			const folderItem = Item._itemForPath(testEnv.createFolder('folder/'));
			const childFileItem = Item._itemForPath(testEnv.createFile('folder/childFile'));
			const childFolderItem = Item._itemForPath(testEnv.createFolder('folder/childFolder/'));
			
			folderItem.empty();
			
			expect(folderItem.children.length).toBe(0);
		});

		it('should not remove the folder itself', function() {
			const folderItem = Item._itemForPath(testEnv.createFolder('folder/'));
			
			folderItem.empty();

			expect(folderItem.exists).toBe(true);
		});
	});
});
