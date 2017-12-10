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
		it('should be true for an existing item', function() {
			let fileItem = Item.itemForPath(testEnv.createFile('file'));
			expect(fileItem.exists).toBeTruthy();
			
			let folderItem = Item.itemForPath(testEnv.createFolder('folder'));
			expect(folderItem.exists).toBeTruthy();
		});

		it('should be false for a non-existent item', function() {
			let fileItem = Item.itemForPath(testEnv.pathFor('file'));
			expect(fileItem.exists).toBeFalsy();
			
			let folderItem = Item.itemForPath(testEnv.pathFor('folder/'));
			expect(folderItem.exists).toBeFalsy();
		});

		it('should be false for an item of a different type', function() {
			testEnv.createFile('file');
			testEnv.createFolder('folder');
			
			let fileItem = Item.itemForPath(testEnv.pathFor('file/'));
			expect(fileItem.exists).toBeFalsy();
			
			let folderItem = Item.itemForPath(testEnv.pathFor('folder'));
			expect(folderItem.exists).toBeFalsy();
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
		it('should provide the size of a file', function() {
			const filePath = testEnv.createFile('file');
			let fileItem = Item.itemForPath(filePath);
			
			expect(fileItem.size).toBe(0);
			
			const fileSize = 1024 * 1024;
			fs.writeFileSync(filePath, Buffer.alloc(fileSize));
			
			expect(fileItem.size).toBe(fileSize);
		});

		it('should provide the size of a folder', function() {
			const folderPath = testEnv.createFolder('folder');
			let folderItem = Item.itemForPath(folderPath);
			
			expect(folderItem.size).toBeGreaterThanOrEqual(0); // I don't understand folder size
			
			const fileSize = 1024 * 1024;
			fs.writeFileSync(path.join(folderPath, 'file'), Buffer.alloc(fileSize));
			
			expect(folderItem.size).toBeGreaterThanOrEqual(fileSize);
		});
	});
	
	describe('#parent', function() {
		it('should provide the parent of an item', function() {
			const parentPath = testEnv.createFolder('parent');
			let parentItem = Item.itemForPath(parentPath);
			let childItem = Item.itemForPath(testEnv.createFile('parent/child'));
			
			expect(childItem.parent instanceof Folder).toBe(true);
			expect(childItem.parent.path).toBe(parentPath);
		});

		it('should be null for the root', function() {
			let rootItem = Item.itemForPath('/');
			
			expect(rootItem.parent).toBe(null);
		});
	});
	
	describe('#dateCreated', function() {
		it('should provide the creation date of an item', function() {
			const fileItem = Item.itemForPath(testEnv.createFile('file'));
			
			expect((fileItem.dateCreated).unix()).toBe(moment().unix());
		});
	});
	
	describe('#dateModified', function() {
		it('should provide the modification date of an item', function() {
			const fileItem = Item.itemForPath(testEnv.createFile('file'));
			
			expect((fileItem.dateModified).unix()).toBe(moment().unix());
		});
	});
	
	describe('#user', function() {
		it('should provide the owner name of an item', function() {
			const currentUserName = execSync(`id -nu`).trim();
			
			const fileItem = Item.itemForPath(testEnv.createFile('file'));
			
			expect(fileItem.user).toBe(currentUserName);
		});
	});
	
	describe('#group', function() {
		it('should provide the group name of an item', function() {
			const currentUserGroupName = execSync(`id -gn`).trim();
			
			const fileItem = Item.itemForPath(testEnv.createFile('file'));
			
			expect(fileItem.group).toBe(currentUserGroupName);
		});
	});
	
	describe('#make()', function() {
		it('should create an empty file', function() {
			const fileItem = Item.itemForPath(testEnv.pathFor('file'));
			fileItem.make();
			
			expect(fileItem.exists).toBe(true);
		});
	
		it('should create an empty folder', function() {
			const folderItem = Item.itemForPath(testEnv.pathFor('folder/'));
			folderItem.make();
			
			expect(folderItem.exists).toBe(true);
		});

		it('should fail if an item of a different type already exists', function() {
			const fileItem = Item.itemForPath(testEnv.pathFor('file'));
			
			testEnv.createFolder('file/');
			
			expect(() => fileItem.make()).toThrow();
		});

		describe('{forgiving: false}', function() {
			it('should fail if the parent doesn\'t exist', function() {
				const fileItem = Item.itemForPath(testEnv.pathFor('nonexistent-parent/file'));
			
				expect(() => fileItem.make()).toThrow();
				expect(fileItem.exists).toBe(false);
			});

			it('should fail if an item of the same type already exists', function() {
				const fileItem = Item.itemForPath(testEnv.pathFor('file'));
				
				fileItem.make();
				
				expect(() => fileItem.make()).toThrow();
			});
		});
	
		describe('{forgiving: true}', function() {
			it('should create the parent hierarchy if it doesn\'t exist', function() {
				const parent1Item = Item.itemForPath(testEnv.pathFor('parent1/'));
				const parent2Item = Item.itemForPath(testEnv.pathFor('parent1/parent2/'));
				const fileItem = Item.itemForPath(testEnv.pathFor('parent1/parent2/file'));
				
				fileItem.make(true);

				expect(parent1Item.exists).toBe(true);
				expect(parent2Item.exists).toBe(true);
				expect(fileItem.exists).toBe(true);
			});

			it('should do nothing if the file already exists', function() {
				const filePath = testEnv.pathFor('file');
				const fileItem = Item.itemForPath(filePath);
				const fileTextContent = 'Some text content.';
				
				fileItem.make();
				fs.appendFileSync(filePath, fileTextContent);
				
				fileItem.make(true);

				expect(fs.readFileSync(filePath, "utf8")).toBe(fileTextContent);
			});

			it('should do nothing if the folder already exists', function() {
				const folderItem = Item.itemForPath(testEnv.pathFor('folder/'));
				const childItem = Item.itemForPath(testEnv.pathFor('folder/child/'));
				
				folderItem.make();
				childItem.make();
				
				folderItem.make(true);

				expect(childItem.exists).toBe(true);
			});
		});
	
		it('should return this', function() {
			const itemItem = Item.itemForPath(testEnv.pathFor('item'));
		
			expect(itemItem.make()).toBe(itemItem);
		});
	});
});
