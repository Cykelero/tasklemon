const fs = require('fs');
const os = require('os');
const constants = require('constants');

const Item = require('../../source/exposed-modules/Item');

const isPosix = os.platform() !== 'win32';
	
ifPosixDescribe = function() {
	if (isPosix) {
		describe.apply(this, arguments);
	} else {
		xdescribe.apply(this, arguments);
	}
};

const ifRootIt = function() {
	const isRoot = process.getuid() === 0;
	
	if (isRoot) {
		it.apply(this, arguments);
	} else {
		xit.apply(this, arguments);
	}
};

ifPosixDescribe('ItemPermissionsSlice', function() {
	let testEnv;
	let initialUmask;
	
	beforeEach(function() {
		testEnv = this.getTestEnv();
	});
	
	beforeAll(function() {
		initialUmask = process.umask();
		process.umask(0);
	});
	
	afterAll(function() {
		process.umask(initialUmask);
	});
	
	const rwxByEveryone = constants.S_IRWXU | constants.S_IRWXG | constants.S_IRWXO;
	
	const accessTestValues = {
		user: {
			canRead: [rwxByEveryone ^ constants.S_IRUSR, constants.S_IRUSR],
			canWrite: [rwxByEveryone ^ constants.S_IWUSR, constants.S_IWUSR],
			canExecute: [rwxByEveryone ^ constants.S_IXUSR, constants.S_IXUSR]
		},
		group: {
			canRead: [rwxByEveryone ^ constants.S_IRGRP, constants.S_IRGRP],
			canWrite: [rwxByEveryone ^ constants.S_IWGRP, constants.S_IWGRP],
			canExecute: [rwxByEveryone ^ constants.S_IXGRP, constants.S_IXGRP]
		},
		other: {
			canRead: [rwxByEveryone ^ constants.S_IROTH, constants.S_IROTH],
			canWrite: [rwxByEveryone ^ constants.S_IWOTH, constants.S_IWOTH],
			canExecute: [rwxByEveryone ^ constants.S_IXOTH, constants.S_IXOTH]
		}
	};
	
	describe('permission accessors', function() {
		it('should allow reading permissions', function() {
			Object.keys(accessTestValues).forEach(identity => {
				Object.keys(accessTestValues[identity]).forEach(permissionType => {
					const sampleModes = accessTestValues[identity][permissionType];
					
					// Permission is absent
					testEnv = this.getTestEnv();
					const absentFilePath = testEnv.pathFor('absentFile');
					
					fs.writeFileSync(absentFilePath, '', {mode: sampleModes[0]});
					const absentPermission = Item._itemForPath(absentFilePath)[identity][permissionType];
					
					if (absentPermission) {
						fail(`Expected ${identity}.${permissionType} to be false.`);
					}
					
					// Permission is present
					testEnv = this.getTestEnv();
					const presentFilePath = testEnv.pathFor('presentFile');
					
					fs.writeFileSync(presentFilePath, '', {mode: sampleModes[1]});
					const presentPermission = Item._itemForPath(presentFilePath)[identity][permissionType];
					
					if (!presentPermission) {
						fail(`Expected ${identity}.${permissionType} to be true.`);
					}
				});
			});
		});

		it('should allow changing permissions', function() {
			Object.keys(accessTestValues).forEach(identity => {
				Object.keys(accessTestValues[identity]).forEach(permissionType => {
					const sampleModes = accessTestValues[identity][permissionType];
					
					// Permission is absent
					const unwritable = (identity === 'user' && permissionType === 'canWrite');
					if (!unwritable) {
						testEnv = this.getTestEnv();
						const absentFilePath = testEnv.pathFor('absentFile');
						const absentFileItem = Item._itemForPath(absentFilePath);
					
						fs.writeFileSync(absentFilePath, '', {mode: sampleModes[0]});
						absentFileItem[identity][permissionType] = true;
						const absentPermission = absentFileItem[identity][permissionType];
					
						if (!absentPermission) {
							fail(`Expected ${identity}.${permissionType} to be true.`);
						}
					}
					
					// Permission is present
					testEnv = this.getTestEnv();
					const presentFilePath = testEnv.pathFor('presentFile');
					const presentFileItem = Item._itemForPath(presentFilePath);
					
					const presentFileMode = sampleModes[1] | constants.S_IWUSR;
					fs.writeFileSync(presentFilePath, '', {mode: presentFileMode});
					presentFileItem[identity][permissionType] = false;
					const presentPermission = presentFileItem[identity][permissionType];
				
					if (presentPermission) {
						fail(`Expected ${identity}.${permissionType} to be false.`);
					}
				});
			});
		});
	});
	
	describe('(ItemUserPermissions)', function() {
		describe('#id', function() {
			it('should provide the owner id of an item', function() {
				const currentUserId = Number(this.execFileSync('id', ['-u']).trim());
			
				const fileItem = Item._itemForPath(testEnv.createFile('file'));
			
				expect(fileItem.user.id).toBe(currentUserId);
			});

			ifRootIt('should allow changing the owner id of an item', function() {
				const newUserId = 0;
				
				const fileItem = Item._itemForPath(testEnv.createFile('file'));
				fileItem.user.id = newUserId;
			
				expect(fileItem.user.id).toBe(newUserId);
			});
		});
		
		describe('#name', function() {
			it('should provide the owner name of an item', function() {
				const currentUserName = this.execFileSync('id', ['-nu']).trim();
			
				const fileItem = Item._itemForPath(testEnv.createFile('file'));
			
				expect(fileItem.user.name).toBe(currentUserName);
			});

			ifRootIt('should allow changing the owner name of an item', function() {
				const newUserName = 'root';
				
				const fileItem = Item._itemForPath(testEnv.createFile('file'));
				fileItem.user.name = newUserName;
			
				expect(fileItem.user.name).toBe(newUserName);
			});
		});
	});
	
	describe('(ItemGroupPermissions)', function() {
		describe('#id', function() {
			it('should provide the group id of an item', function() {
				const currentUserGroupId = Number(this.execFileSync('id', ['-g']).trim());
			
				const fileItem = Item._itemForPath(testEnv.createFile('file'));
			
				expect(fileItem.group.id).toBe(currentUserGroupId);
			});

			ifRootIt('should allow changing the group id of an item', function() {
				const newGroupId = 0;
				
				const fileItem = Item._itemForPath(testEnv.createFile('file'));
				fileItem.group.id = newGroupId;
			
				expect(fileItem.group.id).toBe(newGroupId);
			});
		});
		
		describe('#name', function() {
			it('should provide the group name of an item', function() {
				const currentUserGroupName = this.execFileSync('id', ['-gn']).trim();
			
				const fileItem = Item._itemForPath(testEnv.createFile('file'));
			
				expect(fileItem.group.name).toBe(currentUserGroupName);
			});

			ifRootIt('should allow changing the group name of an item', function() {
				const newGroupName = (process.platform === 'darwin') ? 'admin' : 'root';
				
				const fileItem = Item._itemForPath(testEnv.createFile('file'));
				fileItem.group.name = newGroupName;
			
				expect(fileItem.group.name).toBe(newGroupName);
			});
		});
	});
});
