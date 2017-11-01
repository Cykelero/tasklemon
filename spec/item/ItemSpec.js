Item = require('../../source/Item');
File = require('../../source/File');
Folder = require('../../source/Folder');

fs = require('fs');

describe('Item', function() {
	let testEnv;
	
	beforeEach(function() {
		testEnv = this.getTestEnv();
	});
	
	describe('when instanciated', function() {
		it('should correctly choose between File and Folder', function() {
			expect(Item.itemForPath('file') instanceof File).toBeTruthy();
			expect(Item.itemForPath('folder/') instanceof Folder).toBeTruthy();
		});

		it('should provide canonical instances', function() {
			expect(Item.itemForPath('file')).toBe(Item.itemForPath('file'));
		});
	});
	
	describe('#exists', function() {
		it('should be true for an existing item', async function() {
			let fileItem = Item.itemForPath(testEnv.createFile('file'));
			expect(await fileItem.exists).toBeTruthy();
			
			let folderItem = Item.itemForPath(testEnv.createFolder('folder'));
			expect(await folderItem.exists).toBeTruthy();
		});

		it('should be false for a non-existent item', async function() {
			let fileItem = Item.itemForPath(testEnv.pathFor('file'));
			expect(await fileItem.exists).toBeFalsy();
			
			let folderItem = Item.itemForPath(testEnv.pathFor('folder/'));
			expect(await folderItem.exists).toBeFalsy();
		});

		it('should be false for an item of the wrong type', async function() {
			testEnv.createFile('file');
			testEnv.createFolder('folder');
			
			let fileItem = Item.itemForPath(testEnv.pathFor('file/'));
			expect(await fileItem.exists).toBeFalsy();
			
			let folderItem = Item.itemForPath(testEnv.pathFor('folder'));
			expect(await folderItem.exists).toBeFalsy();
		});
	});
});