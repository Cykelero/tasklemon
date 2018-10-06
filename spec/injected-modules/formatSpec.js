const moment = require('moment');

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
			
			describe('{unit}', function() {
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
		describe('.integer', function() {
			it('should round', function() {
				expect(format.number.integer(1.1)).toBe('1');
				expect(format.number.integer(1.5)).toBe('2');
			});
		});
	});
	describe('.date', function() {
		describe('.short', function() {
			it('should format the date concisely', function() {
				expect(format.date.short(new Date('March 11, 1984, 8:30'))).toBe('84-03-11 08:30:00');
			});
			
			describe('{notTime: true}', function() {
				it('should omit the time', function() {
					expect(format.date.short(new Date('March 11, 1984, 8:30'), true)).toBe('84-03-11');
				});
			});
		});
		describe('.long', function() {
			it('should format the date verbosely', function() {
				expect(format.date.long(new Date('March 11, 1984, 8:30'))).toBe('Sunday, March 11th, 1984, 08:30:00');
			});
			
			describe('{notTime: true}', function() {
				it('should omit the time', function() {
					expect(format.date.long(new Date('March 11, 1984, 8:30'), true)).toBe('Sunday, March 11th, 1984');
				});
			});
		});
		
		describe('.relative', function() {
			it('should format a future date relatively', function() {
				expect(format.date.relative(moment().add(750, 'milliseconds'))).toBe('in 749 milliseconds'); // time passes
				expect(format.date.relative(moment().add(5, 'seconds'))).toBe('in 5 seconds');
				expect(format.date.relative(moment().add(60, 'seconds'))).toBe('in a minute');
				expect(format.date.relative(moment().add(120, 'seconds'))).toBe('in 2 minutes');
				expect(format.date.relative(moment().add(1, 'hour'))).toBe('in an hour');
			});

			it('should format a past date relatively', function() {
				expect(format.date.relative(moment().subtract(750, 'milliseconds'))).toBe('750 milliseconds ago');
				expect(format.date.relative(moment().subtract(5, 'seconds'))).toBe('5 seconds ago');
				expect(format.date.relative(moment().subtract(60, 'seconds'))).toBe('a minute ago');
				expect(format.date.relative(moment().subtract(120, 'seconds'))).toBe('2 minutes ago');
				expect(format.date.relative(moment().subtract(1, 'hour'))).toBe('an hour ago');
			});
		});
	});
		
	describe('.duration', function() {
		describe('.between', function() {
			it('should format a duration', function() {
				expect(format.duration.between(moment(), moment().add(750, 'milliseconds'))).toBe('750 milliseconds');
				expect(format.duration.between(moment(), moment().add(5, 'seconds'))).toBe('5 seconds');
				expect(format.duration.between(moment(), moment().add(60, 'seconds'))).toBe('a minute');
				expect(format.duration.between(moment(), moment().add(120, 'seconds'))).toBe('2 minutes');
				expect(format.duration.between(moment(), moment().add(1, 'hour'))).toBe('an hour');
			});
		});
	});
});
