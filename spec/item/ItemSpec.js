const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const moment = require('moment');

const Item = require('../../source/Item');
const File = require('../../source/File');
const Folder = require('../../source/Folder');

function execSync() {
	return childProcess.execSync.apply(this, arguments).toString();
}

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
	
	describe('#path', function() {
		it('should provide the path of a folder', function() {
			const folderPath = testEnv.createFolder('folder');
			let folderItem = Item.itemForPath(folderPath);
			expect(folderItem.path).toBe(folderPath);
		});
		
		it('should provide the path of a file', function() {
			const filePath = testEnv.createFile('file');
			let fileItem = Item.itemForPath(filePath);
			expect(fileItem.path).toBe(filePath);
		});
		
		it('should provide the path of a non-existent item', function() {
			const filePath = testEnv.pathFor('file');
			let fileItem = Item.itemForPath(filePath);
			expect(fileItem.path).toBe(filePath);
		});
		
		it('should provide the path of an item with a non-existent parennt', function() {
			const filePath = testEnv.pathFor('nonexistent-parent/file');
			let fileItem = Item.itemForPath(filePath);
			expect(fileItem.path).toBe(filePath);
		});

		it('should return the actual path of a symlink target', function() {
			const linkTargetPath = testEnv.createFolder('link-target');
			const linkTargetChildPath = testEnv.createFile('link-target/child');

			const linkContainerPath = testEnv.createFolder('link-container');
			execSync(`ln -s "${linkTargetPath}" link`, {cwd: linkContainerPath});
			
			let linkTargetChildItem = Item.itemForPath(linkTargetChildPath);
			
			expect(linkTargetChildItem.path).toBe(linkTargetChildPath);
		});
	});
	
	describe('#name', function() {
		it('should provide the name of a folder', function() {
			let folderItem = Item.itemForPath(testEnv.createFolder('folder'));
			expect(folderItem.name).toBe('folder');
		});
		
		it('should provide the name of a file', function() {
			let fileItem = Item.itemForPath(testEnv.createFile('file'));
			expect(fileItem.name).toBe('file');
		});
	});
	
	describe('#size', function() {
		it('should provide the size of a file', async function() {
			const filePath = testEnv.createFile('file');
			let fileItem = Item.itemForPath(filePath);
			
			expect(await fileItem.size).toBe(0);
			
			const fileSize = 1024 * 1024;
			fs.writeFileSync(filePath, Buffer.alloc(fileSize));
			
			expect(await fileItem.size).toBe(fileSize);
		});

		it('should provide the size of a folder', async function() {
			const folderPath = testEnv.createFolder('folder');
			let folderItem = Item.itemForPath(folderPath);
			
			expect(await folderItem.size).toBeGreaterThanOrEqual(0); // I don't understand folder size
			
			const fileSize = 1024 * 1024;
			fs.writeFileSync(path.join(folderPath, 'file'), Buffer.alloc(fileSize));
			
			expect(await folderItem.size).toBeGreaterThanOrEqual(fileSize);
		});
	});
	
	describe('#parent', function() {
		it('should provide the parent of a folder', function() {
			const parentPath = testEnv.createFolder('parent');
			let parentItem = Item.itemForPath(parentPath);
			let childItem = Item.itemForPath(testEnv.createFolder('parent/child'));
			
			expect(childItem.parent.name).toBe('parent');
			expect(childItem.parent instanceof Folder).toBe(true);
		});

		it('should be null for the root', function() {
			let rootItem = Item.itemForPath('/');
			
			expect(rootItem.parent).toBe(null);
		});
	});
	
	describe('#dateCreated', function() {
		it('should provide the created date of a folder', async function() {
			const folderItem = Item.itemForPath(testEnv.createFolder('folder'));
			
			expect((await folderItem.dateCreated).unix()).toBe(moment().unix());
		});

		it('should provide the created date of a file', async function() {
			const fileItem = Item.itemForPath(testEnv.createFile('file'));
			
			expect((await fileItem.dateCreated).unix()).toBe(moment().unix());
		});
	});
	
	describe('#dateModified', function() {
		it('should provide the created date of a folder', async function() {
			const folderItem = Item.itemForPath(testEnv.createFolder('folder'));
			
			expect((await folderItem.dateModified).unix()).toBe(moment().unix());
		});

		it('should provide the created date of a file', async function() {
			const fileItem = Item.itemForPath(testEnv.createFile('file'));
			
			expect((await fileItem.dateModified).unix()).toBe(moment().unix());
		});
	});
	
	describe('#user', function() {
		it('should provide the owner name of a folder', async function() {
			const currentUserName = execSync(`id -nu`).trim();
			
			const folderItem = Item.itemForPath(testEnv.createFolder('folder'));
			
			expect(await folderItem.user).toBe(currentUserName);
		});

		it('should provide the owner name of a file', async function() {
			const currentUserName = execSync(`id -nu`).trim();
			
			const fileItem = Item.itemForPath(testEnv.createFile('file'));
			
			expect(await fileItem.user).toBe(currentUserName);
		});
	});
	
	describe('#group', function() {
		it('should provide the owner name of a folder', async function() {
			const currentUserGroupName = execSync(`id -gn`).trim();
			
			const folderItem = Item.itemForPath(testEnv.createFolder('folder'));
			
			expect(await folderItem.group).toBe(currentUserGroupName);
		});

		it('should provide the owner name of a file', async function() {
			const currentUserGroupName = execSync(`id -gn`).trim();
			
			const fileItem = Item.itemForPath(testEnv.createFile('file'));
			
			expect(await fileItem.group).toBe(currentUserGroupName);
		});
	});
});
