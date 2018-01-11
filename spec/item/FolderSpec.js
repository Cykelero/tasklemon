const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const Item = require('../../source/Item');

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
});
