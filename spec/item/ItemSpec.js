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
			expect(Item._itemForPath('file') instanceof File).toBeTruthy();
			expect(Item._itemForPath('folder/') instanceof Folder).toBeTruthy();
		});
	});
	
	describe('#exists', function() {
		it('should be true for an existing item', function() {
			let fileItem = Item._itemForPath(testEnv.createFile('file'));
			expect(fileItem.exists).toBeTruthy();
			
			let folderItem = Item._itemForPath(testEnv.createFolder('folder'));
			expect(folderItem.exists).toBeTruthy();
		});

		it('should be false for a non-existent item', function() {
			let fileItem = testEnv.itemFor('file');
			expect(fileItem.exists).toBeFalsy();
			
			let folderItem = testEnv.itemFor('folder/');
			expect(folderItem.exists).toBeFalsy();
		});

		it('should be false for an item of a different type', function() {
			testEnv.createFile('file');
			testEnv.createFolder('folder');
			
			let fileItem = testEnv.itemFor('file/');
			expect(fileItem.exists).toBeFalsy();
			
			let folderItem = testEnv.itemFor('folder');
			expect(folderItem.exists).toBeFalsy();
		});
	});
	
	describe('#path', function() {
		it('should provide the path of a file', function() {
			const filePath = testEnv.createFile('file');
			let fileItem = Item._itemForPath(filePath);
			expect(fileItem.path).toBe(filePath);
		});
		
		it('should provide the path of a folder', function() {
			const folderPath = testEnv.createFolder('folder');
			let folderItem = Item._itemForPath(folderPath);
			expect(folderItem.path).toBe(folderPath);
		});
		
		it('should provide the path of a non-existent item', function() {
			const filePath = testEnv.pathFor('file');
			let fileItem = Item._itemForPath(filePath);
			expect(fileItem.path).toBe(filePath);
		});
		
		it('should provide the path of an item with a non-existent parennt', function() {
			const filePath = testEnv.pathFor('nonexistent-parent/file');
			let fileItem = Item._itemForPath(filePath);
			expect(fileItem.path).toBe(filePath);
		});

		it('should return the actual path of a symlink target', function() {
			const linkTargetPath = testEnv.createFolder('link-target');
			const linkTargetChildPath = testEnv.createFile('link-target/child');

			const linkContainerPath = testEnv.createFolder('link-container');
			execSync(`ln -s "${linkTargetPath}" link`, {cwd: linkContainerPath});
			
			let linkTargetChildItem = Item._itemForPath(linkTargetChildPath);
			
			expect(linkTargetChildItem.path).toBe(linkTargetChildPath);
		});
	});
	
	describe('#name', function() {
		it('should provide the name of an item', function() {
			let fileItem = Item._itemForPath(testEnv.createFile('file'));
			expect(fileItem.name).toBe('file');
		});
	});
	
	describe('#size', function() {
		it('should provide the size of a file', function() {
			const filePath = testEnv.createFile('file');
			let fileItem = Item._itemForPath(filePath);
			
			expect(fileItem.size).toBe(0);
			
			const fileSize = 1024 * 1024;
			fs.writeFileSync(filePath, Buffer.alloc(fileSize));
			
			expect(fileItem.size).toBe(fileSize);
		});

		it('should provide the size of a folder', function() {
			const folderPath = testEnv.createFolder('folder');
			let folderItem = Item._itemForPath(folderPath);
			
			expect(folderItem.size).toBeGreaterThanOrEqual(0); // I don't understand folder size
			
			const fileSize = 1024 * 1024;
			fs.writeFileSync(path.join(folderPath, 'file'), Buffer.alloc(fileSize));
			
			expect(folderItem.size).toBeGreaterThanOrEqual(fileSize);
		});
	});
	
	describe('#parent', function() {
		it('should provide the parent of an item', function() {
			const parentPath = testEnv.createFolder('parent');
			let parentItem = Item._itemForPath(parentPath);
			let childItem = Item._itemForPath(testEnv.createFile('parent/child'));
			
			expect(childItem.parent instanceof Folder).toBe(true);
			expect(childItem.parent.path).toBe(parentPath);
		});

		it('should be null for the root', function() {
			let rootItem = Item._itemForPath('/');
			
			expect(rootItem.parent).toBe(null);
		});
	});
	
	describe('#dateCreated', function() {
		it('should provide the creation date of an item', function() {
			const fileItem = Item._itemForPath(testEnv.createFile('file'));
			
			expect((fileItem.dateCreated).unix()).toBe(moment().unix());
		});
	});
	
	describe('#dateModified', function() {
		it('should provide the modification date of an item', function() {
			const fileItem = Item._itemForPath(testEnv.createFile('file'));
			
			expect((fileItem.dateModified).unix()).toBe(moment().unix());
		});
	});
	
	describe('#user', function() {
		it('should provide the owner name of an item', function() {
			const currentUserName = execSync(`id -nu`).trim();
			
			const fileItem = Item._itemForPath(testEnv.createFile('file'));
			
			expect(fileItem.user).toBe(currentUserName);
		});
	});
	
	describe('#group', function() {
		it('should provide the group name of an item', function() {
			const currentUserGroupName = execSync(`id -gn`).trim();
			
			const fileItem = Item._itemForPath(testEnv.createFile('file'));
			
			expect(fileItem.group).toBe(currentUserGroupName);
		});
	});
	
	describe('#make()', function() {
		it('should create an empty file', function() {
			const fileItem = testEnv.itemFor('file');
			fileItem.make();
			
			expect(fileItem.exists).toBe(true);
		});
	
		it('should create an empty folder', function() {
			const folderItem = testEnv.itemFor('folder/');
			folderItem.make();
			
			expect(folderItem.exists).toBe(true);
		});

		it('should fail if an item of a different type already exists', function() {
			const fileItem = testEnv.itemFor('file');
			
			testEnv.createFolder('file/');
			
			expect(() => fileItem.make()).toThrow();
		});

		describe('{forgiving: false}', function() {
			it('should fail if the parent doesn\'t exist', function() {
				const fileItem = testEnv.itemFor('nonexistent-parent/file');
			
				expect(() => fileItem.make()).toThrow();
				expect(fileItem.exists).toBe(false);
			});

			it('should fail if an item of the same type already exists', function() {
				const fileItem = testEnv.itemFor('file');
				
				fileItem.make();
				
				expect(() => fileItem.make()).toThrow();
			});
		});
	
		describe('{forgiving: true}', function() {
			it('should create the parent hierarchy if it doesn\'t exist', function() {
				const parent1Item = testEnv.itemFor('parent1/');
				const parent2Item = testEnv.itemFor('parent1/parent2/');
				const fileItem = testEnv.itemFor('parent1/parent2/file');
				
				fileItem.make(true);

				expect(parent1Item.exists).toBe(true);
				expect(parent2Item.exists).toBe(true);
				expect(fileItem.exists).toBe(true);
			});

			it('should do nothing if the file already exists', function() {
				const filePath = testEnv.pathFor('file');
				const fileItem = Item._itemForPath(filePath);
				const fileTextContent = 'Some text content.';
				
				fileItem.make();
				fs.appendFileSync(filePath, fileTextContent);
				
				fileItem.make(true);

				expect(fs.readFileSync(filePath, "utf8")).toBe(fileTextContent);
			});

			it('should do nothing if the folder already exists', function() {
				const folderItem = testEnv.itemFor('folder/');
				const childItem = testEnv.itemFor('folder/child/');
				
				folderItem.make();
				childItem.make();
				
				folderItem.make(true);

				expect(childItem.exists).toBe(true);
			});
		});
	
		it('should return this', function() {
			const fileItem = testEnv.itemFor('file');
		
			expect(fileItem.make()).toBe(fileItem);
		});
	});
	
	describe('#moveTo()', function() {
		it('should move the item', function() {
			const fileItem = testEnv.itemFor('file').make();
			const destinationItem = testEnv.itemFor('destination/').make();
		
			fileItem.moveTo(destinationItem);
			
			expect(testEnv.itemFor('file').exists).toBe(false);
			expect(testEnv.itemFor('destination/file').exists).toBe(true);
		});

		it('should update the item', function() {
			const fileItem = testEnv.itemFor('file').make();
			const destinationItem = testEnv.itemFor('destination/').make();
		
			fileItem.moveTo(destinationItem);
			
			expect(fileItem.path).toBe(testEnv.pathFor('destination/file'));
		});

		it('should update other instances of the item', function() {
			const fileItem = testEnv.itemFor('file').make();
			const fileSecondItem = testEnv.itemFor('file');
			const destinationItem = testEnv.itemFor('destination/').make();
		
			fileItem.moveTo(destinationItem);
			
			expect(fileSecondItem.path).toBe(testEnv.pathFor('destination/file'));
		});

		it('should move children of the item', function() {
			const folderItem = testEnv.itemFor('folder/').make();
			const childItem = testEnv.itemFor('folder/child').make();
			const destinationItem = testEnv.itemFor('destination/').make();
		
			folderItem.moveTo(destinationItem);
			
			expect(testEnv.itemFor('folder/child').exists).toBe(false);
			expect(testEnv.itemFor('destination/folder/child').exists).toBe(true);
		});

		it('should update instances of the item\'s children', function() {
			const folderItem = testEnv.itemFor('folder/').make();
			const childItem = testEnv.itemFor('folder/child').make();
			const destinationItem = testEnv.itemFor('destination/').make();
		
			folderItem.moveTo(destinationItem);
			
			expect(childItem.path).toBe(testEnv.pathFor('destination/folder/child'));
		});
		
		it('should fail if the destination is not a folder', function() {
			const folderItem = testEnv.itemFor('folder/').make();
			const destinationItem = testEnv.itemFor('destination').make();
			
			expect(() => folderItem.moveTo(destinationItem)).toThrow();
			expect(testEnv.itemFor('folder/').exists).toBe(true);
		});

		it('should fail if there is already an item of the same name at the destination', function() {
			const fileItem = testEnv.itemFor('file').make();
			const destinationItem = testEnv.itemFor('destination/').make();
			const destinationChildItem = testEnv.itemFor('destination/file').make();
			
			expect(() => fileItem.moveTo(destinationItem)).toThrow();
			expect(testEnv.itemFor('file').exists).toBe(true);
		});

		describe('{forgiving: false}', function() {
			it('should fail if the destination doesn\'t exist', function() {
				const fileItem = testEnv.itemFor('file').make();
				const destinationItem = testEnv.itemFor('destination/');
			
				expect(() => fileItem.moveTo(destinationItem)).toThrow();
				expect(testEnv.itemFor('file').exists).toBe(true);
				expect(testEnv.itemFor('destination/file').exists).toBe(false);
			});
		});
	
		describe('{forgiving: true}', function() {
			it('should create the destination hierarchy if it doesn\'t exist', function() {
				const fileItem = testEnv.itemFor('file').make();
				const destinationItem = testEnv.itemFor('destination/');
		
				fileItem.moveTo(destinationItem, true);

				expect(testEnv.itemFor('file').exists).toBe(false);
				expect(testEnv.itemFor('destination/file').exists).toBe(true);
			});
		});
	
		it('should return this', function() {
			const fileItem = testEnv.itemFor('file').make();
			const destinationItem = testEnv.itemFor('destination/').make();
		
			expect(fileItem.moveTo(destinationItem)).toBe(fileItem);
		});
	});
});
