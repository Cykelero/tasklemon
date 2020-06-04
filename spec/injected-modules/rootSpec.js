const os = require('os');

const root = require('../../source/exposed-modules/injected/root');

const isPosix = os.platform() !== 'win32';

describe('root', function() {
	it('should have the correct path', function() {
		if (isPosix) {
			expect(root.path).toBe('/');
		} else {
			expect(root.path).toMatch(/^\w+:\/$/);
		}
	});

	it('should have the correct name', function() {
		if (isPosix) {
			expect(root.name).toBe('');
		} else {
			expect(root.name).toMatch(/^\w+:$/);
		}
	});
});
