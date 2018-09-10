const format = require('../../source/injected-modules/format');

describe('format', function() {
	describe('.number', function() {
		describe('.float', function() {
			it('should add commas', function() {
				expect(format.number.float(1, null, 0)).toBe('1');
				expect(format.number.float(10, null, 0)).toBe('10');
				expect(format.number.float(100, null, 0)).toBe('100');
				expect(format.number.float(1000, null, 0)).toBe('1,000');
				expect(format.number.float(10000, null, 0)).toBe('10,000');
			});
			
			it('should round', function() {
				expect(format.number.float(1.111, null, 2)).toBe('1.11');
				expect(format.number.float(1.115, null, 2)).toBe('1.12');
				expect(format.number.float(1.1, null, 0)).toBe('1');
				expect(format.number.float(1.5, null, 0)).toBe('2');
			});
			
			it('should add zeroes', function() {
				expect(format.number.float(1, null, 0)).toBe('1');
				expect(format.number.float(1, null, 1)).toBe('1.0');
				expect(format.number.float(1, null, 2)).toBe('1.00');
				expect(format.number.float(1, null, 3)).toBe('1.000');
				expect(format.number.float(1, null, 4)).toBe('1.0000');
			});
			
			describe('with a unit', function() {
				it('should pluralize the unit for positive numbers', function() {
					expect(format.number.float(0, 'duck')).toBe('0.00 ducks');
					expect(format.number.float(.5, 'duck')).toBe('0.50 duck');
					expect(format.number.float(1, 'duck')).toBe('1.00 duck');
					expect(format.number.float(2, 'duck')).toBe('2.00 ducks');
				});

				it('should pluralize the unit for negative numbers', function() {
					expect(format.number.float(-2, 'duck')).toBe('-2.00 ducks');
					expect(format.number.float(-1, 'duck')).toBe('-1.00 duck');
					expect(format.number.float(-.5, 'duck')).toBe('-0.50 duck');
				});

				it('should accept a detailed unit', function() {
					expect(format.number.float(1, ['duck', 'deck'])).toBe('1.00 duck');
					expect(format.number.float(2, ['duck', 'deck'])).toBe('2.00 deck');
				});
			});
		});
	});
});
