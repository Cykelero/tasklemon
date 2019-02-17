const moment = require('moment');

const TypeDefinition = require('../../source/TypeDefinition');

function execType() {
	return TypeDefinition.execute.apply(null, arguments).value;
}

describe('TypeDefinition', function() {
	describe('for Boolean', function() {
		it('should accept common truthy strings', function() {
			expect(execType(Boolean, 'y')).toBe(true);
			expect(execType(Boolean, 'yes')).toBe(true);
			expect(execType(Boolean, 'true')).toBe(true);
			expect(execType(Boolean, '1')).toBe(true);
		});

		it('should accept common falsy strings', function() {
			expect(execType(Boolean, 'n')).toBe(false);
			expect(execType(Boolean, 'no')).toBe(false);
			expect(execType(Boolean, 'false')).toBe(false);
			expect(execType(Boolean, '0')).toBe(false);
		});
	});

	describe('for Number', function() {
		it('should accept integers', function() {
			expect(execType(Number, '1')).toBe(1);
			expect(execType(Number, '120')).toBe(120);
		});

		it('should accept floats', function() {
			expect(execType(Number, '13.5')).toBe(13.5);
			expect(execType(Number, '0.5')).toBe(.5);
			expect(execType(Number, '.5')).toBe(.5);
		});

		it('should accept negative numbers', function() {
			expect(execType(Number, '-1')).toBe(-1);
			expect(execType(Number, '-0')).toBe(0);
			expect(execType(Number, '-10')).toBe(-10);
			expect(execType(Number, '-0.5')).toBe(-.5);
			expect(execType(Number, '-.5')).toBe(-.5);
		});
	});

	describe('for Object', function() {
		it('should accept serialized objects', function() {
			expect(execType(Object, '{"a": true, "b": 3}')).toEqual(jasmine.objectContaining({a: true, b: 3}));
		});
	});

	describe('for Array', function() {
		it('should accept space-separated arrays', function() {
			expect(execType(Array, '3 2 1')).toEqual(['3', '2', '1']);
		});
		
		it('should understand quoted items', function() {
			expect(execType(Array, '\'5 4\' "3 2" 1')).toEqual(['5 4', '3 2', '1']);
			expect(execType(Array, '\'5 4\'"3 2"1')).toEqual(['5 4', '3 2', '1']);
		});
		
		it('should understand escaped characters', function() {
			expect(execType(Array, '"hello\\" there" friend')).toEqual(['hello" there', 'friend']);
			expect(execType(Array, '"hello\\"" there')).toEqual(['hello"', 'there']);
			expect(execType(Array, '"hello\\\\" there')).toEqual(['hello\\', 'there']);
		});
	});

	describe('for moment', function() {
		it('should accept date strings', function() {
			expect(execType(moment, '18-03-20').isSame(moment('2018-03-20T00:00:00.000'))).toBeTruthy();
			expect(execType(moment, '2018-03-20').isSame(moment('2018-03-20T00:00:00.000'))).toBeTruthy();
			expect(execType(moment, '2018-03-20 12:30').isSame(moment('2018-03-20T12:30:00.000'))).toBeTruthy();
		});
	});

	describe('for Date', function() {
		it('should accept date strings', function() {
			expect(execType(Date, '18-03-20').toString()).toEqual(new Date('2018-03-20T00:00:00').toString());
			expect(execType(Date, '2018-03-20').toString()).toEqual(new Date('2018-03-20T00:00:00').toString());
			expect(execType(Date, '2018-03-20 12:30').toString()).toEqual(new Date('2018-03-20T12:30:00').toString());
		});
	});

	describe('for RegExp', function() {
		it('should accept regular expressions', function() {
			expect(execType(RegExp, 'test(.?)').source).toEqual('test(.?)');
			expect(execType(RegExp, 'test(.?)/').source).toEqual('test(.?)');
			expect(execType(RegExp, '/test(.?)').source).toEqual('test(.?)');
			expect(execType(RegExp, '/test(.?)/').source).toEqual('test(.?)');
			expect(execType(RegExp, '/test(.?)/g').source).toEqual('test(.?)');
			expect(execType(RegExp, '/test(.?)/g').flags).toEqual('g');
		});
	});
});
