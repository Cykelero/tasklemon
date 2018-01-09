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
	
	describe('#md5', function() {
		it('should provide the md5 hash of the file', function() {
			const filePath = testEnv.createFile('file');
			const fileItem = Item._itemForPath(filePath);
			fs.writeFileSync(filePath, 'text-content');
			
			expect(fileItem.md5).toBe('901a84918e4d5121ceae18305d2cd938');
		});
	});
});
