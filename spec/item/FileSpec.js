const fs = require('fs');
const path = require('path');
const os = require('os');

const File = require('../../source/exposed-modules/File');
const TypeDefinition = require('../../source/TypeDefinition');

const isPosix = os.platform() !== 'win32';

describe('File', function() {
	let testEnv;
	
	beforeEach(function() {
		testEnv = this.getTestEnv();
	});
	
	describe('TypeDefinition', function() {
		it('should accept a path', function() {
			const userPath = isPosix
				? 'folder/file'
				: 'folder\\file';
			
			const file = TypeDefinition.execute(File, userPath);
			
			expect(file.valid).toBeTruthy();
			expect(file.value.path).toBe(path.posix.join(this.getCleanCWD(), 'folder/file'));
		});
	});
	
	describe('#content', function() {
		it('should provide the content of the file as a string', function() {
			const filePath = testEnv.createFile('file');
			const fileItem = this.itemForPath(filePath);
			fs.writeFileSync(filePath, 'text-content');
			
			expect(fileItem.content).toBe('text-content');
		});
	
		describe('{value}', function() {
			it('should change the content of the item', function() {
				const fileItem = this.itemForPath(testEnv.createFile('file'));
				
				fileItem.content = 'text-content';
				expect(fileItem.content).toBe('text-content');
				
				fileItem.content = 'new-text-content';
				expect(fileItem.content).toBe('new-text-content');
			});

			it('should encode the provided value in JSON', function() {
				const fileItem = this.itemForPath(testEnv.createFile('file'));
				
				const savedObject = {key: 'value'};
				fileItem.content = savedObject;
				expect(JSON.parse(fileItem.content)).toEqual(jasmine.objectContaining(savedObject));
			});
		});
	});
	
	describe('#md5', function() {
		it('should provide the md5 hash of the file', function() {
			const filePath = testEnv.createFile('file');
			const fileItem = this.itemForPath(filePath);
			fs.writeFileSync(filePath, 'text-content');
			
			expect(fileItem.md5).toBe('901a84918e4d5121ceae18305d2cd938');
		});
	});
	
	describe('#getContentAs() {type}', function() {
		it('should return the content of the file cast with the specified type definition', function() {
			const fileItem = this.itemForPath(testEnv.createFile('file'));
			
			fileItem.content = {key: 'value'};
			expect(fileItem.getContentAs(Object)).toEqual(jasmine.objectContaining({key: 'value'}));
			
			fileItem.content = '1984';
			expect(fileItem.getContentAs(Number)).toBe(1984);
		});
	});
	
	describe('#appendLine() {content}', function() {
		it('should append the provided content to the file', function() {
			const fileItem = this.itemForPath(testEnv.createFile('file'));
			
			fileItem.content = 'first-line\n';
			fileItem.appendLine('second-line');
			
			expect(fileItem.content).toBe('first-line\nsecond-line\n');
		});

		it('should encode the provided value in JSON', function() {
			const fileItem = this.itemForPath(testEnv.createFile('file'));
			const savedObject = {key: 'value'};
			
			fileItem.content = 'first-line\n';
			fileItem.appendLine(savedObject);
			
			expect(fileItem.content).toBe('first-line\n' + JSON.stringify(savedObject) + '\n');
		});
		
		describe('{forgiving: false}', function() {
			it('should fail if the file does not exist', function() {
				const fileItem = testEnv.itemFor('file');
				
				expect(() => fileItem.appendLine('some-text')).toThrow();
				expect(fileItem.exists).toBe(false);
			});
		});
		
		describe('{forgiving: true}', function() {
			it('should create the file if it does not exist', function() {
				const fileItem = testEnv.itemFor('file');
				
				fileItem.appendLine('some-text', true);
				
				expect(fileItem.exists).toBe(true);
				expect(fileItem.content).toBe('some-text\n');
			});
		});
	});
	
	describe('#prependLine() {content}', function() {
		it('should prepend the provided content to the file', function() {
			const fileItem = this.itemForPath(testEnv.createFile('file'));
			
			fileItem.content = 'second-line';
			fileItem.prependLine('first-line');
			
			expect(fileItem.content).toBe('first-line\nsecond-line');
		});

		it('should encode the provided value in JSON', function() {
			const fileItem = this.itemForPath(testEnv.createFile('file'));
			const savedObject = {key: 'value'};
			
			fileItem.content = 'second-line';
			fileItem.prependLine(savedObject);
			
			expect(fileItem.content).toBe(JSON.stringify(savedObject) + '\nsecond-line');
		});
		
		describe('{forgiving: false}', function() {
			it('should fail if the file does not exist', function() {
				const fileItem = testEnv.itemFor('file');
				
				expect(() => fileItem.prependLine('some-text')).toThrow();
				expect(fileItem.exists).toBe(false);
			});
		});
		
		describe('{forgiving: true}', function() {
			it('should create the file if it does not exist', function() {
				const fileItem = testEnv.itemFor('file');
				
				fileItem.prependLine('some-text', true);
				
				expect(fileItem.exists).toBe(true);
				expect(fileItem.content).toBe('some-text\n');
			});
		});
	});
	
	describe('#clear()', function() {
		it('should clear the content of the file', function() {
			const fileItem = this.itemForPath(testEnv.createFile('file'));
			
			fileItem.content = 'second-line';
			fileItem.clear();
			
			expect(fileItem.content).toBe('');
		});
		
		describe('{forgiving: false}', function() {
			it('should fail if the file does not exist', function() {
				const fileItem = testEnv.itemFor('file');
				
				expect(() => fileItem.clear()).toThrow();
				expect(fileItem.exists).toBe(false);
			});
		});
		
		describe('{forgiving: true}', function() {
			it('should create the file if it does not exist', function() {
				const fileItem = testEnv.itemFor('file');
				
				fileItem.clear(true);
				
				expect(fileItem.exists).toBe(true);
				expect(fileItem.content).toBe('');
			});
		});
	});
});
