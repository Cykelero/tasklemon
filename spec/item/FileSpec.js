const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const Item = require('../../source/Item');

function execSync() {
	return childProcess.execSync.apply(this, arguments).toString();
}

describe('Item', function() {
	let testEnv;
	
	beforeEach(function() {
		testEnv = this.getTestEnv();
	});
	
	describe('#content', function() {
		it('should provide the content of the file as a string', function() {
			const filePath = testEnv.createFile('file');
			const fileItem = Item._itemForPath(filePath);
			fs.writeFileSync(filePath, 'text-content');
			
			expect(fileItem.content).toBe('text-content');
		});
	
		describe('{value}', function() {
			it('should change the content of the item', function() {
				const fileItem = Item._itemForPath(testEnv.createFile('file'));
				
				fileItem.content = 'text-content';
				expect(fileItem.content).toBe('text-content');
				
				fileItem.content = 'new-text-content';
				expect(fileItem.content).toBe('new-text-content');
			});

			it('should encode the provided value in JSON', function() {
				const fileItem = Item._itemForPath(testEnv.createFile('file'));
				
				const savedObject = {key: 'value'};
				fileItem.content = savedObject;
				expect(JSON.parse(fileItem.content)).toEqual(jasmine.objectContaining(savedObject));
			});
		});
	});
	
	describe('#md5', function() {
		it('should provide the md5 hash of the file', function() {
			const filePath = testEnv.createFile('file');
			const fileItem = Item._itemForPath(filePath);
			fs.writeFileSync(filePath, 'text-content');
			
			expect(fileItem.md5).toBe('901a84918e4d5121ceae18305d2cd938');
		});
	});
	
	describe('#getContentAs() {type}', function() {
		it('should return the content of the file cast with the specified type definition', function() {
			const fileItem = Item._itemForPath(testEnv.createFile('file'));
			
			fileItem.content = {key: 'value'};
			expect(fileItem.getContentAs(Object)).toEqual(jasmine.objectContaining({key: 'value'}));
			
			fileItem.content = '1984';
			expect(fileItem.getContentAs(Number)).toBe(1984);
		});
	});
	
	describe('#appendLine() {content}', function() {
		it('should append the provided content to the file', function() {
			const fileItem = Item._itemForPath(testEnv.createFile('file'));
			
			fileItem.content = 'first-line';
			fileItem.appendLine('second-line');
			
			expect(fileItem.content).toBe('first-line\nsecond-line');
		});

		it('should encode the provided value in JSON', function() {
			const fileItem = Item._itemForPath(testEnv.createFile('file'));
			const savedObject = {key: 'value'};
			
			fileItem.content = 'first-line';
			fileItem.appendLine(savedObject);
			
			expect(fileItem.content).toBe('first-line\n' + JSON.stringify(savedObject));
		});
	});
	
	describe('#prependLine() {content}', function() {
		it('should prepend the provided content to the file', function() {
			const fileItem = Item._itemForPath(testEnv.createFile('file'));
			
			fileItem.content = 'second-line';
			fileItem.prependLine('first-line');
			
			expect(fileItem.content).toBe('first-line\nsecond-line');
		});

		it('should encode the provided value in JSON', function() {
			const fileItem = Item._itemForPath(testEnv.createFile('file'));
			const savedObject = {key: 'value'};
			
			fileItem.content = 'second-line';
			fileItem.prependLine(savedObject);
			
			expect(fileItem.content).toBe(JSON.stringify(savedObject) + '\nsecond-line');
		});
	});
});
