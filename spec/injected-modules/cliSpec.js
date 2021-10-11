const moment = require('moment');

const cli = require('../../source/exposed-modules/injected/cli');
const ScriptEnvironment = require('../../source/ScriptEnvironment');

describe('Argument parsing', function() {
	beforeEach(function() {
		// Reset cli state
		cli.args = null;
	});
	
	describe('named argument', function() {
		it('should accept a string', function() {
			ScriptEnvironment.rawArguments = ['--named', 'value'];
			
			cli.accept({
				namedArg: ['--named', String]
			});
			
			expect(cli.args.namedArg).toEqual('value');
		});
		
		it('should accept a boolean (true)', function() {
			ScriptEnvironment.rawArguments = ['--named'];
			
			cli.accept({
				namedArg: ['--named', Boolean]
			});
			
			expect(cli.args.namedArg).toEqual(true);
		});
		
		it('should accept a boolean (false)', function() {
			ScriptEnvironment.rawArguments = [];
			
			cli.accept({
				namedArg: ['--named', Boolean]
			});
			
			expect(cli.args.namedArg).toEqual(false);
		});
		
		it('should accept a negative number', function() {
			ScriptEnvironment.rawArguments = ['--named', '-34'];
			
			cli.accept({
				namedArg: ['--named', Number]
			});
			
			expect(cli.args.namedArg).toEqual(-34);
		});
	});
	
	describe('shorthand argument', function() {
		it('should accept a string', function() {
			ScriptEnvironment.rawArguments = ['-s', 'value'];
			
			cli.accept({
				shorthandArg: ['-s', String]
			});
			
			expect(cli.args.shorthandArg).toBe('value');
		});
		
		it('should accept a boolean (true)', function() {
			ScriptEnvironment.rawArguments = ['-s'];
			
			cli.accept({
				shorthandArg: ['-s', Boolean]
			});
			
			expect(cli.args.shorthandArg).toBe(true);
		});
		
		it('should accept a boolean (false)', function() {
			ScriptEnvironment.rawArguments = [];
			
			cli.accept({
				shorthandArg: ['-s', Boolean]
			});
			
			expect(cli.args.shorthandArg).toBe(false);
		});
		
		it('should allow grouping', function() {
			ScriptEnvironment.rawArguments = ['-stv', 'value'];
			
			cli.accept({
				shorthandArg0: ['-s', Boolean],
				shorthandArg1: ['-t', Boolean],
				shorthandArg2: ['-u', Boolean],
				shorthandArg3: ['-v', String]
			});
			
			expect(cli.args.shorthandArg0).toBe(true);
			expect(cli.args.shorthandArg1).toBe(true);
			expect(cli.args.shorthandArg2).toBe(false);
			expect(cli.args.shorthandArg3).toBe('value');
		});
		
		it('should interpret all group characters as shorthand', async function() {
			const testEnv = this.getTestEnv();
			
			const scriptSource = `
				cli.accept({
					shorthandArg0: ['-s', Boolean],
					shorthandArg1: ['-t', Boolean]
				});
			`;
			
			const scriptRunError = await testEnv.runLemonScript(scriptSource, ['-stv'])
				.catch(error => error);
			
			expect(scriptRunError.toString()).toContain('Argument error: “-v” unexpected');
		});
	});
	
	describe('positional argument', function() {
		it('should accept a string', function() {
			ScriptEnvironment.rawArguments = ['value0', 'value1'];
			
			cli.accept({
				positionalArgument0: ['#0', String],
				positionalArgument1: ['#1', String]
			});
			
			expect(cli.args.positionalArgument0).toBe('value0');
			expect(cli.args.positionalArgument1).toBe('value1');
		});
		
		it('should accept a dash', function() {
			ScriptEnvironment.rawArguments = ['-', 'value1'];
			
			cli.accept({
				positionalArgument0: ['#0', String],
				positionalArgument1: ['#1', String]
			});
			
			expect(cli.args.positionalArgument0).toBe('-');
			expect(cli.args.positionalArgument1).toBe('value1');
		});
		
		it('should honor a delimiter', function() {
			ScriptEnvironment.rawArguments = ['value0', '--named', '--', '--value1', '--value2'];
			
			cli.accept({
				positionalArgument0: ['#0', String],
				positionalArgument1: ['#1', String],
				positionalArgument2: ['#2', String],
				namedArg: ['--named', Boolean]
			});
			
			expect(cli.args.positionalArgument0).toBe('value0');
			expect(cli.args.positionalArgument1).toBe('--value1');
			expect(cli.args.positionalArgument2).toBe('--value2');
		});
		
		it('should fail if a single definition has multiple positional arguments', async function() {
				const testEnv = this.getTestEnv();
				
				const scriptSource = `
					cli.accept({
						someArg: ['#0 #1']
					});
				`;
				
				const scriptRunError = await testEnv.runLemonScript(scriptSource)
					.catch(error => error);
				
				expect(scriptRunError.toString()).toContain('Syntax for `someArg` is invalid: cannot have more than one positional identifier');
		});
	});
	
	describe('rest argument', function() {
		it('should accept strings', function() {
			ScriptEnvironment.rawArguments = ['value0', 'value1'];
			
			cli.accept({
				restArgument: ['#+', String]
			});
			
			expect(cli.args.restArgument).toEqual(['value0', 'value1']);
		});
		
		it('should accept dashes', function() {
			ScriptEnvironment.rawArguments = ['-', 'value1'];
			
			cli.accept({
				restArgument: ['#+', String]
			});
			
			expect(cli.args.restArgument).toEqual(['-', 'value1']);
		});
	});
	
	describe('mixed argument types', function() {
		it('should allow missing arguments', function() {
			ScriptEnvironment.rawArguments = ['rest0', '-s', 'shorthand', 'rest1'];
			
			cli.accept({
				namedArg: ['--named', String],
				shorthandArg: ['-s', String],
				restArgument: ['#+', String]
			});
			
			expect(cli.args.namedArg).toEqual(null);
			expect(cli.args.shorthandArg).toEqual('shorthand');
			expect(cli.args.restArgument).toEqual(['rest0', 'rest1']);
		});
		
		it('should allow mixing positional and rest arguments', function() {
			ScriptEnvironment.rawArguments = ['value0', 'value1', 'value2', 'value3'];
			
			cli.accept({
				positionalArgument0: ['#0', String],
				positionalArgument2: ['#2', String],
				restArgument: ['#+', String]
			});
			
			expect(cli.args.positionalArgument0).toEqual('value0');
			expect(cli.args.positionalArgument2).toEqual('value2');
			expect(cli.args.restArgument).toEqual(['value1', 'value3']);
		});
	});
	
	describe('TypeDefinition support', function() {
		it('should accept built-in typedefs', function() {
			ScriptEnvironment.rawArguments = ['1984', 'ab?'];
			
			cli.accept({
				numberArg: ['#0', Number],
				regexArg: ['#1', RegExp]
			});
			
			expect(cli.args.numberArg).toEqual(1984);
			expect(cli.args.regexArg).toEqual(/ab?/);
		});
		
		it('should accept custom typedefs', function() {
			ScriptEnvironment.rawArguments = ['a', 'b'];
			
			function trueIfA(value) {
				return value === 'a';
			}
			
			cli.accept({
				arg0: ['#0', [trueIfA]],
				arg1: ['#1', [trueIfA]]
			});
			
			expect(cli.args.arg0).toEqual(true);
			expect(cli.args.arg1).toEqual(false);
		});
		
		it('should accept typedef arrays', function() {
			ScriptEnvironment.rawArguments = ['1984', '--', '-34'];
			
			function isPositive(value) {
				if (typeof value !== 'number') {
					throw 'is not a number';
				}
				
				return value >= 0;
			}
			
			cli.accept({
				arg0: ['#0', [Number, isPositive]],
				arg1: ['#1', [Number, isPositive]]
			});
			
			expect(cli.args.arg0).toEqual(true);
			expect(cli.args.arg1).toEqual(false);
		});
		
		it('should display typedef rejections', async function() {
				const testEnv = this.getTestEnv();
				
				const scriptSource = `
					cli.accept({
						numberArg: ['#0', Number]
					});
				`;
				
				const scriptRunError = await testEnv.runLemonScript(scriptSource, ['text'])
					.catch(error => error);
				
				expect(scriptRunError.toString()).toContain('Argument error: “text” is not a valid number');
		});
	});
	
	describe('omit behavior', function() {
		describe('for required()', function() {
			it('should support identified arguments', async function() {
				const testEnv = this.getTestEnv();
				
				const scriptSource = `
					cli.accept({
						namedArg: ['-n --named', String, required()]
					});
				`;
				
				const scriptRunError = await testEnv.runLemonScript(scriptSource)
					.catch(error => error);
				
				expect(scriptRunError.toString()).toContain('Argument error: “--named” is required');
			});
			
			it('should support multiple identified arguments', async function() {
				const testEnv = this.getTestEnv();
				
				const scriptSource = `
					cli.accept({
						firstArg: ['-1', Boolean, required()],
						secondArg: ['-2', Boolean, required()],
						thirdArg: ['-3', Boolean, required()],
						fourthArg: ['-4', Boolean, required()],
						fifthArg: ['-5', Boolean]
					});
				`;
				
				const scriptRunError = await testEnv.runLemonScript(scriptSource, ['-2'])
					.catch(error => error);
				
				expect(scriptRunError.toString()).toContain('Argument error: “-1”, “-3” and “-4” are required');
			});
		});
	});
	
	// TODO: Test input errors: unknown args, duplicate args, named arg without its expected value. Can't be done right now, since the code calls process.exit() when user input is incorrect.
});
