const fs = require('fs');
const path = require('path');
const os = require('os');

const moment = require('moment');

const Item = require('../../source/exposed-modules/Item');
const File = require('../../source/exposed-modules/File');
const Folder = require('../../source/exposed-modules/Folder');
const root = require('../../source/exposed-modules/injected/root');
const TypeDefinition = require('../../source/TypeDefinition');

const isPosix = os.platform() !== 'win32';
const isMacOS = os.platform() === 'darwin';
const driveId = isPosix ? '' : /[^\\]+/.exec(process.cwd())[0];
	
const ifPosixIt = isPosix ? it : xit;
const ifMacOSDescribe = isMacOS ? describe : xdescribe;

describe('Item', function() {
	let testEnv;
	
	beforeEach(function() {
		testEnv = this.getTestEnv();
	});
	
	describe('when instantiated', function() {
		it('should correctly choose between File and Folder', function() {
			expect(testEnv.itemFor('file') instanceof File).toBeTruthy();
			expect(testEnv.itemFor('folder/') instanceof Folder).toBeTruthy();
		});
		
		it('should resolve relative paths to non-existent items', function() {
			const item = this.itemForPath('non-existent/some-folder/some-file');
			expect(item.path).toBe(path.posix.join(this.getCleanCWD(), 'non-existent/some-folder/some-file'));
			expect(item.name).toBe('some-file');
		});
		
		it('should resolve relative path components', function() {
			const item1 = this.itemForPath('/non-existent/../some-folder/./some-file');
			expect(item1.path).toBe(driveId + '/some-folder/some-file');
			expect(item1.name).toBe('some-file');

			const item2 = this.itemForPath('/non-existent/.');
			expect(item2.path).toBe(driveId + '/non-existent/');
			expect(item2.name).toBe('non-existent');

			const item3 = this.itemForPath('/non-existent/..');
			if (isPosix) {
				expect(item3.path).toBe('/');
				expect(item3.name).toBe('');
			} else {
				expect(item3.path).toBe(driveId + '/');
				expect(item3.name).toBe(driveId);
			}
		});
		
		it('should resolve standalone relative path components', function() {
			const herePath = path.join(process.cwd(), path.sep);
			const herePathComponents = path.parse(herePath);
			const hereName = herePathComponents.base;
			
			const hereParentPath = herePathComponents.dir + path.sep;
			const hereParentName = path.basename(hereParentPath);
			
			const item1 = this.itemForPath('.');
			expect(item1.path).toBe(this.toCleanPath(herePath));
			expect(item1.name).toBe(hereName);
			
			const item2 = this.itemForPath('..');
			expect(item2.path).toBe(this.toCleanPath(hereParentPath));
			expect(item2.name).toBe(hereParentName);
		});
		
		if (!isPosix) {
			it('should resolve absolute paths starting with C:', function() {
				const rootC = this.itemForPath('C:/');
				
				expect(rootC.path).toBe('C:/');
				expect(rootC.name).toBe('C:');
				
				const itemOnC = this.itemForPath('C:/non-existent/');
				
				expect(itemOnC.path).toBe('C:/non-existent/');
				expect(itemOnC.name).toBe('non-existent');
			});
			
			it('should resolve absolute paths with a non-C Windows drive letter', function() {
				const rootD = this.itemForPath('D:/');
				
				expect(rootD.path).toBe('D:/');
				expect(rootD.name).toBe('D:');
				
				const itemOnD = this.itemForPath('D:/non-existent/');
				
				expect(itemOnD.path).toBe('D:/non-existent/');
				expect(itemOnD.name).toBe('non-existent');
				expect(itemOnD.parent.name).toBe('D:');
			});
		}
	});
	
	describe('TypeDefinition', function() {
		it('should accept a path to an existing file', function() {
			process.chdir(testEnv.nativePath);
			
			testEnv.createFile('file');
			const userPath = 'file';
			
			const file = TypeDefinition.execute(Item, userPath);
			
			expect(file.valid).toBeTruthy();
			expect(file.value instanceof File).toBeTruthy();
			expect(file.value.path).toBe(testEnv.pathFor(userPath));
		});
		
		it('should accept a path to an existing folder', function() {
			process.chdir(testEnv.nativePath);
			
			testEnv.createFolder('folder');
			const userPath = 'folder';
			
			const file = TypeDefinition.execute(Item, userPath);
			
			expect(file.valid).toBeTruthy();
			expect(file.value instanceof Folder).toBeTruthy();
			expect(file.value.path).toBe(testEnv.pathFor(userPath + '/'));
		});
		
		it('should fail if the item does not exist', function() {
			process.chdir(testEnv.nativePath);
			
			const userPath = 'folder';
			
			const file = TypeDefinition.execute(Item, userPath);
			
			expect(file.valid).toBeFalsy();
		});
		
		let currentCWD;
		
		beforeEach(function() {
			currentCWD = process.cwd();
		});
		
		afterEach(function() {
			process.chdir(currentCWD);
		});
	});
	
	describe('#exists', function() {
		it('should be true for an existing item', function() {
			let fileItem = this.itemForPath(testEnv.createFile('file'));
			expect(fileItem.exists).toBeTruthy();
			
			let folderItem = this.itemForPath(testEnv.createFolder('folder/'));
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
			testEnv.createFolder('folder/');
			
			let fileItem = testEnv.itemFor('file/');
			expect(fileItem.exists).toBeFalsy();
			
			let folderItem = testEnv.itemFor('folder');
			expect(folderItem.exists).toBeFalsy();
		});
	});
	
	describe('#path', function() {
		it('should provide the path of a file', function() {
			const filePath = testEnv.createFile('file');
			let fileItem = this.itemForPath(filePath);
			expect(fileItem.path).toBe(filePath);
		});
		
		it('should provide the path of a folder', function() {
			const folderPath = testEnv.createFolder('folder/');
			let folderItem = this.itemForPath(folderPath);
			expect(folderItem.path).toBe(folderPath);
		});
		
		it('should provide the path of a non-existent item', function() {
			const filePath = testEnv.pathFor('file');
			let fileItem = this.itemForPath(filePath);
			expect(fileItem.path).toBe(filePath);
		});
		
		it('should provide the path of an item with a non-existent parennt', function() {
			const filePath = testEnv.pathFor('nonexistent-parent/file');
			let fileItem = this.itemForPath(filePath);
			expect(fileItem.path).toBe(filePath);
		});

		ifPosixIt('should return the actual path of a symlink target', function() {
			const linkTargetPath = testEnv.createFolder('link-target/');
			const linkTargetChildPath = testEnv.createFile('link-target/child');

			const linkContainerPath = testEnv.createFolder('link-container/');
			this.execFileSync('ln', ['-s', linkTargetPath, 'link'], {cwd: linkContainerPath});
			
			let linkTargetChildItem = this.itemForPath(linkTargetChildPath)
			expect(linkTargetChildItem.path).toBe(linkTargetChildPath);
		});
	});
	
	describe('#name', function() {
		it('should provide the name of the item', function() {
			const fileItem = this.itemForPath(testEnv.createFile('file'));
			expect(fileItem.name).toBe('file');
		});
	
		describe('{value}', function() {
			it('should rename the item', function() {
				const fileItem = this.itemForPath(testEnv.createFile('file'));
				
				fileItem.name = 'file2';
				
				expect(testEnv.itemFor('file').exists).toBe(false);
				expect(testEnv.itemFor('file2').exists).toBe(true);
			});

			it('should update the item', function() {
				const fileItem = this.itemForPath(testEnv.createFile('file'));
				
				fileItem.name = 'file2';
				
				expect(fileItem.name).toBe('file2');
			});

			it('should update other instances of the item', function() {
				const fileItem = this.itemForPath(testEnv.createFile('file'));
				const fileSecondItem = testEnv.itemFor('file');
				
				fileItem.name = 'file2';
				
				expect(fileSecondItem.name).toBe('file2');
			});

			it('should move children of the item', function() {
				const folderItem = this.itemForPath(testEnv.createFolder('folder/'));
				testEnv.createFile('folder/child');
				
				folderItem.name = 'folder2';
				
				expect(testEnv.itemFor('folder/child').exists).toBe(false);
				expect(testEnv.itemFor('folder2/child').exists).toBe(true);
			});

			it('should update instances of the item\'s children', function() {
				const folderItem = this.itemForPath(testEnv.createFolder('folder/'));
				const childItem = this.itemForPath(testEnv.createFile('folder/child'));
				
				folderItem.name = 'folder2';
				
				expect(childItem.path).toBe(testEnv.pathFor('folder2/child'));
			});
			
			it('should not fail if value is the current name', function() {
				const fileItem = this.itemForPath(testEnv.createFile('file'));
				
				fileItem.name = 'file';
			});

			it('should fail if there is already an item of the same name', function() {
				const fileItem = this.itemForPath(testEnv.createFile('file'));
				testEnv.createFile('file2');
				
				expect(() => { fileItem.name = 'file2' }).toThrow();
				expect(testEnv.itemFor('file').exists).toBe(true);
			});
		});
	});
	
	describe('#bareName', function() {
		it('should provide the name of the item without the extension', function() {
			const fileItem = this.itemForPath(testEnv.createFile('file.txt'));
			expect(fileItem.bareName).toBe('file');

			const file2Item = this.itemForPath(testEnv.createFile('file.tar.gz'));
			expect(file2Item.bareName).toBe('file.tar');
		});

		it('should ignore an initial dot', function() {
			const fileItem = this.itemForPath(testEnv.createFile('.file'));
			expect(fileItem.bareName).toBe('.file');
			
			const file2Item = this.itemForPath(testEnv.createFile('.file.txt'));
			expect(file2Item.bareName).toBe('.file');
		});
	
		describe('{value}', function() {
			it('should rename the item', function() {
				const fileItem = this.itemForPath(testEnv.createFile('file.txt'));
				
				fileItem.bareName = 'file2';
				
				expect(fileItem.name).toBe('file2.txt');
			});

			it('should ignore an initial dot', function() {
				const fileItem = this.itemForPath(testEnv.createFile('.file'));
				
				fileItem.bareName = '.file2';
				
				expect(fileItem.name).toBe('.file2');
			});
		});
	});
	
	describe('#extension', function() {
		it('should provide the extension of the item', function() {
			const fileItem = this.itemForPath(testEnv.createFile('file.txt'));
			expect(fileItem.extension).toBe('txt');

			const file2Item = this.itemForPath(testEnv.createFile('file.tar.gz'));
			expect(file2Item.extension).toBe('gz');

			const file3Item = this.itemForPath(testEnv.createFile('file'));
			expect(file3Item.extension).toBe('');
		});
		
		it('should ignore an initial dot', function() {
			const fileItem = this.itemForPath(testEnv.createFile('.file'));
			expect(fileItem.extension).toBe('');
		});
	
		describe('{value}', function() {
			it('should change the extension', function() {
				const fileItem = this.itemForPath(testEnv.createFile('file.json'));
				
				fileItem.extension = 'txt';
				
				expect(fileItem.name).toBe('file.txt');
			});
			
			it('should add an extension if there is none', function() {
				const fileItem = this.itemForPath(testEnv.createFile('file'));
				
				fileItem.extension = 'txt';
				
				expect(fileItem.name).toBe('file.txt');
			});
			
			it('should remove the extension if passed an empty string', function() {
				const fileItem = this.itemForPath(testEnv.createFile('file.txt'));
				
				fileItem.extension = '';
				
				expect(fileItem.name).toBe('file');
			});
		
			it('should ignore an initial dot', function() {
				const fileItem = this.itemForPath(testEnv.createFile('.file'));
				fileItem.extension = 'txt';
				expect(fileItem.name).toBe('.file.txt');
			});
		});
	});
	
	describe('#size', function() {
		it('should provide the size of a file', function() {
			const filePath = testEnv.createFile('file');
			let fileItem = this.itemForPath(filePath);
			
			expect(fileItem.size).toBe(0);
			
			const fileSize = 1024 * 1024;
			fs.writeFileSync(filePath, Buffer.alloc(fileSize));
			
			expect(fileItem.size).toBe(fileSize);
		});

		it('should provide the size of a folder', function() {
			const folderPath = testEnv.createFolder('folder/');
			let folderItem = this.itemForPath(folderPath);
			
			expect(folderItem.size).toBeGreaterThanOrEqual(0); // I don't understand folder size
			
			const fileSize = 1024 * 1024;
			fs.writeFileSync(path.join(folderPath, 'file'), Buffer.alloc(fileSize));
			
			expect(folderItem.size).toBeGreaterThanOrEqual(fileSize);
		});
	});
	
	describe('#parent', function() {
		it('should provide the parent of the item', function() {
			const parentPath = testEnv.createFolder('parent/');
			let childItem = this.itemForPath(testEnv.createFile('parent/child'));
			
			expect(childItem.parent instanceof Folder).toBe(true);
			expect(childItem.parent.path).toBe(parentPath);
		});

		it('should be null for the root', function() {
			expect(root.parent).toBe(null);
		});
		
		it('{newParent} should allow moving the item', function() {
			let fileItem = this.itemForPath(testEnv.createFile('file'));
			let folderItem = this.itemForPath(testEnv.createFolder('folder/'));
			
			fileItem.parent = folderItem;
			expect(fileItem.parent.path).toBe(folderItem.path);
		});
	});
	
	describe('#dateCreated', function() {
		it('should provide the creation date of the item', function() {
			const fileItem = this.itemForPath(testEnv.createFile('file'));
			
			expect(fileItem.dateCreated.unix()).toBe(moment().unix());
		});
		
		ifMacOSDescribe('{value} should allow changing the creation date of the item', function() {
			it('to a former date', function() {
				let fileItem = this.itemForPath(testEnv.createFile('file'));
			
				const newDate = moment().subtract(1, 'day');
				fileItem.dateCreated = newDate;
				
				expect(fileItem.dateCreated.unix()).toBe(newDate.unix());
			});

			it('to a later date', function() {
				let fileItem = this.itemForPath(testEnv.createFile('file'));
			
				const newDate = moment().add(1, 'day');
				fileItem.dateCreated = newDate;
				
				expect(fileItem.dateCreated.unix()).toBe(newDate.unix());
			});
		});
	});
	
	describe('#dateModified', function() {
		it('should provide the modification date of the item', function() {
			const fileItem = this.itemForPath(testEnv.createFile('file'));
			
			expect(fileItem.dateModified.unix()).toBe(moment().unix());
		});
		
		ifMacOSDescribe('{value} should allow changing the modification date of the item', function() {
			it('to a former date', function() {
				let fileItem = this.itemForPath(testEnv.createFile('file'));
			
				const newDate = moment().subtract(1, 'day');
				fileItem.dateModified = newDate;
				
				expect(fileItem.dateModified.unix()).toBe(newDate.unix());
			});

			it('to a later date', function() {
				let fileItem = this.itemForPath(testEnv.createFile('file'));
			
				const newDate = moment().add(1, 'day');
				fileItem.dateModified = newDate;
				
				expect(fileItem.dateModified.unix()).toBe(newDate.unix());
			});
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
			expect(() => fileItem.make(true)).toThrow();
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
				const fileItem = this.itemForPath(filePath);
				const fileTextContent = 'Some text content.';
				
				fileItem.make();
				fs.appendFileSync(filePath, fileTextContent);
				
				fileItem.make(true);

				expect(fs.readFileSync(filePath, 'utf8')).toBe(fileTextContent);
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
			testEnv.itemFor('folder/child').make();
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
			const fileItem = testEnv.itemFor('file').make();
			const destinationItem = testEnv.itemFor('destination').make();
			
			expect(() => fileItem.moveTo(destinationItem)).toThrow();
			expect(testEnv.itemFor('file').exists).toBe(true);
		});

		it('should fail if there is already an item of the same name at the destination', function() {
			const fileItem = testEnv.itemFor('file').make();
			const destinationItem = testEnv.itemFor('destination/').make();
			testEnv.itemFor('destination/file').make();
			
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
	
	describe('#copyTo()', function() {
		it('should copy the item', function() {
			const fileItem = testEnv.itemFor('file').make();
			const destinationItem = testEnv.itemFor('destination/').make();
			
			fileItem.copyTo(destinationItem);
			
			expect(testEnv.itemFor('destination/file').exists).toBe(true);
		});

		it('should copy children of the item', function() {
			const folderItem = testEnv.itemFor('folder/').make();
			testEnv.itemFor('folder/child').make();
			const destinationItem = testEnv.itemFor('destination/').make();
			
			folderItem.copyTo(destinationItem);
			
			expect(testEnv.itemFor('destination/folder/child').exists).toBe(true);
		});

		it('should not move the item', function() {
			const fileItem = testEnv.itemFor('file').make();
			const destinationItem = testEnv.itemFor('destination/').make();
			
			fileItem.copyTo(destinationItem);
			
			expect(testEnv.itemFor('file').exists).toBe(true);
		});
		
		it('should not update the item', function() {
			const fileItem = testEnv.itemFor('file').make();
			const destinationItem = testEnv.itemFor('destination/').make();
			
			fileItem.copyTo(destinationItem);
			
			expect(fileItem.path).toBe(testEnv.pathFor('file'));
		});
		
		it('should fail if the destination is not a folder', function() {
			const fileItem = testEnv.itemFor('file').make();
			const destinationItem = testEnv.itemFor('destination').make();
			
			expect(() => fileItem.copyTo(destinationItem)).toThrow();
		});

		it('should fail if there is already an item of the same name at the destination', function() {
			const fileItem = testEnv.itemFor('file').make();
			const destinationItem = testEnv.itemFor('destination/').make();
			testEnv.itemFor('destination/file').make();
			
			expect(() => fileItem.copyTo(destinationItem)).toThrow();
		});

		describe('{forgiving: false}', function() {
			it('should fail if the destination doesn\'t exist', function() {
				const fileItem = testEnv.itemFor('file').make();
				const destinationItem = testEnv.itemFor('destination/');
			
				expect(() => fileItem.copyTo(destinationItem)).toThrow();
				expect(testEnv.itemFor('destination/file').exists).toBe(false);
			});
		});
	
		describe('{forgiving: true}', function() {
			it('should create the destination hierarchy if it doesn\'t exist', function() {
				const fileItem = testEnv.itemFor('file').make();
				const destinationItem = testEnv.itemFor('destination/');
		
				fileItem.copyTo(destinationItem, true);

				expect(testEnv.itemFor('destination/file').exists).toBe(true);
			});
		});
	
		it('should return the copied item', function() {
			const fileItem = testEnv.itemFor('file').make();
			const destinationItem = testEnv.itemFor('destination/').make();
			
			const copyResult = fileItem.copyTo(destinationItem);
			
			expect(copyResult).not.toBe(fileItem);
			expect(copyResult.path).toBe(testEnv.pathFor('destination/file'));
		});
	});
	
	describe('#duplicate()', function() {
		it('should duplicate the item', function() {
			const fileItem = testEnv.itemFor('file').make();
			
			fileItem.duplicate();
			
			expect(testEnv.itemFor('file copy').exists).toBe(true);
		});

		it('should copy children of the item', function() {
			const folderItem = testEnv.itemFor('folder/').make();
			testEnv.itemFor('folder/child').make();
			
			folderItem.duplicate();
			
			expect(testEnv.itemFor('folder copy/child').exists).toBe(true);
		});
		
		it('should automatically select a non-conflicting name', function() {
			const fileItem = testEnv.itemFor('file').make();
			
			fileItem.duplicate();
			expect(testEnv.itemFor('file copy').exists).toBe(true);
			
			fileItem.duplicate();
			expect(testEnv.itemFor('file copy 2').exists).toBe(true);
			
			fileItem.duplicate();
			expect(testEnv.itemFor('file copy 3').exists).toBe(true);
		});
		
		it('should preserve the file extension', function() {
			const fileItem = testEnv.itemFor('file.txt').make();
			
			expect(fileItem.duplicate().name).toBe('file copy.txt');
			
			expect(fileItem.duplicate().name).toBe('file copy 2.txt');
		});
		
		it('should not move the item', function() {
			const fileItem = testEnv.itemFor('file').make();
			
			fileItem.duplicate();
			
			expect(testEnv.itemFor('file').exists).toBe(true);
		});
		
		it('should not update the item', function() {
			const fileItem = testEnv.itemFor('file').make();
			
			fileItem.duplicate();
			
			expect(fileItem.path).toBe(testEnv.pathFor('file'));
		});
		
		describe('{copyName}', function() {
			it('should use the new name for the copy', function() {
				const fileItem = testEnv.itemFor('file').make();
			
				fileItem.duplicate('duplicate-file');
			
				expect(testEnv.itemFor('duplicate-file').exists).toBe(true);
			});
			
			it('should fail if the new name contains a slash', function() {
				const fileItem = testEnv.itemFor('file').make();
		
				expect(() => fileItem.duplicate('file copy/')).toThrow();
			});
			
			it('should fail if there is already an item with the new name', function() {
				const fileItem = testEnv.itemFor('file').make();
				testEnv.itemFor('duplicate-file').make();
			
				expect(() => fileItem.duplicate('duplicate-file')).toThrow();
			});
		});
	
		it('should return the copied item', function() {
			const fileItem = testEnv.itemFor('file').make();
			
			const duplicationResult = fileItem.duplicate();
			
			expect(duplicationResult).not.toBe(fileItem);
			expect(duplicationResult.path).toBe(testEnv.pathFor('file copy'));
		});
	});
	
	describe('#delete()', function() {
		it('should delete the item', function() {
			const fileItem = testEnv.itemFor('file').make();
			
			fileItem.delete();
			
			expect(testEnv.itemFor('file').exists).toBe(false);
		});
		
		describe('{immediately: true}', function() {
			it('should delete the item', function() {
				const fileItem = testEnv.itemFor('file').make();
			
				fileItem.delete(true);
			
				expect(testEnv.itemFor('file').exists).toBe(false);
			});
		});
		
		it('should return the deleted item', function() {
			const fileItem = testEnv.itemFor('file').make();
			
			expect(fileItem.delete()).toBe(fileItem);
		});
	});
	
	describe('#equals', function() {
		describe('{other}', function() {
			it('should be true for identical items', function() {
				const fileItem1 = testEnv.itemFor('file');
				const fileItem2 = testEnv.itemFor('file');
			
				expect(fileItem1.equals(fileItem2)).toBeTruthy();

				const folderItem1 = testEnv.itemFor('folder/');
				const folderItem2 = testEnv.itemFor('folder/');
			
				expect(folderItem1.equals(folderItem2)).toBeTruthy();
			});
		
			it('should be false for items with a different path', function() {
				const file1Item = testEnv.itemFor('file');
				const file2Item = testEnv.itemFor('parent/file');
			
				expect(file1Item.equals(file2Item)).toBeFalsy();
			});
		
			it('should be false for items with a different type', function() {
				const fileItem = testEnv.itemFor('item');
				const folderItem = testEnv.itemFor('item/');
			
				expect(fileItem.equals(folderItem)).toBeFalsy();
			});
		});
	});
});
