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

		it('should be false for an item of a different type', async function() {
			testEnv.createFile('file');
			testEnv.createFolder('folder');
			
			let fileItem = Item.itemForPath(testEnv.pathFor('file/'));
			expect(await fileItem.exists).toBeFalsy();
			
			let folderItem = Item.itemForPath(testEnv.pathFor('folder'));
			expect(await folderItem.exists).toBeFalsy();
		});
	});
	
	describe('#path', function() {
		it('should provide the path of a file', function() {
			const filePath = testEnv.createFile('file');
			let fileItem = Item.itemForPath(filePath);
			expect(fileItem.path).toBe(filePath);
		});
		
		it('should provide the path of a folder', function() {
			const folderPath = testEnv.createFolder('folder');
			let folderItem = Item.itemForPath(folderPath);
			expect(folderItem.path).toBe(folderPath);
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
		it('should provide the name of an item', function() {
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
		it('should provide the parent of an item', function() {
			const parentPath = testEnv.createFolder('parent');
			let parentItem = Item.itemForPath(parentPath);
			let childItem = Item.itemForPath(testEnv.createFile('parent/child'));
			
			expect(childItem.parent.name).toBe('parent');
			expect(childItem.parent instanceof Folder).toBe(true);
		});

		it('should be null for the root', function() {
			let rootItem = Item.itemForPath('/');
			
			expect(rootItem.parent).toBe(null);
		});
	});
	
	describe('#dateCreated', function() {
		it('should provide the creation date of an item', async function() {
			const fileItem = Item.itemForPath(testEnv.createFile('file'));
			
			expect((await fileItem.dateCreated).unix()).toBe(moment().unix());
		});
	});
	
	describe('#dateModified', function() {
		it('should provide the modification date of an item', async function() {
			const fileItem = Item.itemForPath(testEnv.createFile('file'));
			
			expect((await fileItem.dateModified).unix()).toBe(moment().unix());
		});
	});
	
	describe('#user', function() {
		it('should provide the owner name of an item', async function() {
			const currentUserName = execSync(`id -nu`).trim();
			
			const fileItem = Item.itemForPath(testEnv.createFile('file'));
			
			expect(await fileItem.user).toBe(currentUserName);
		});
	});
	
	describe('#group', function() {
		it('should provide the owner name of an item', async function() {
			const currentUserGroupName = execSync(`id -gn`).trim();
			
			const fileItem = Item.itemForPath(testEnv.createFile('file'));
			
			expect(await fileItem.group).toBe(currentUserGroupName);
		});
	});
	
	describe('#make()', function() {
		it('should create an empty file', async function() {
			const fileItem = Item.itemForPath(testEnv.pathFor('file'));
			await fileItem.make();
			
			expect(await fileItem.exists).toBe(true);
		});
	
		it('should create an empty folder', async function() {
			const folderItem = Item.itemForPath(testEnv.pathFor('folder/'));
			await folderItem.make();
			
			expect(await folderItem.exists).toBe(true);
		});

		it('should fail if an item of a different type already exists', function(done) {
			const fileItem = Item.itemForPath(testEnv.pathFor('file'));
			
			testEnv.createFolder('file/');
			
			fileItem.make().then(fail, done);
		});

		describe('{forgiving: false}', function() {
			it('should fail if the parent doesn\'t exist', function(done) {
				const fileItem = Item.itemForPath(testEnv.pathFor('nonexistent-parent/file'));
				
				fileItem.make()
					.then(fail, async function() {
						expect(await fileItem.exists).toBe(false);
						done();
					});
			});

			it('should fail if an item of the same type already exists', async function(done) {
				const fileItem = Item.itemForPath(testEnv.pathFor('file'));
				
				await fileItem.make();
				
				fileItem.make().then(fail, done);
			});
		});
	
		describe('{forgiving: true}', function() {
			it('should create the parent hierarchy if it doesn\'t exist', async function() {
				const parent1Item = Item.itemForPath(testEnv.pathFor('parent1/'));
				const parent2Item = Item.itemForPath(testEnv.pathFor('parent1/parent2/'));
				const fileItem = Item.itemForPath(testEnv.pathFor('parent1/parent2/file'));
				
				await fileItem.make(true);

				expect(await parent1Item.exists).toBe(true);
				expect(await parent2Item.exists).toBe(true);
				expect(await fileItem.exists).toBe(true);
			});

			it('should do nothing if the file already exists', async function() {
				const filePath = testEnv.pathFor('file');
				const fileItem = Item.itemForPath(filePath);
				const fileTextContent = 'Some text content.';
				
				await fileItem.make();
				fs.appendFileSync(filePath, fileTextContent);
				
				await fileItem.make(true);

				expect(fs.readFileSync(filePath, "utf8")).toBe(fileTextContent);
			});

			it('should do nothing if the folder already exists', async function() {
				const folderItem = Item.itemForPath(testEnv.pathFor('folder/'));
				const childItem = Item.itemForPath(testEnv.pathFor('folder/child/'));
				
				await folderItem.make();
				await childItem.make();
				
				await folderItem.make(true);

				expect(await childItem.exists).toBe(true);
			});
		});
	
		it('should return this', async function() {
			const itemItem = Item.itemForPath(testEnv.pathFor('item'));
		
			expect(await itemItem.make()).toBe(itemItem);
		});
	});
});
