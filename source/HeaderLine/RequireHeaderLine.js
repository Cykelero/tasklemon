/* Represents a package requirement line in a TL script header. */

const HeaderLine = require('./HeaderLine');

module.exports = class RequireHeaderLine extends HeaderLine {
	constructor(values) {
		super();
		
		this.requiredPackages = values.requiredPackages;
	}
	
	toString() {
		const requiredPackagesString = this.requiredPackages.map(requiredPackage =>
			`${requiredPackage.name}@${requiredPackage.version}`
		).join(', ');
		
		return `// tl:require: ${requiredPackagesString}`;
	}
	
	static forString(lineString) {
		const lineParts = /^\/\/\s*tl:require:\s+([^\n]+?)\s*$/.exec(lineString);
		
		if (!lineParts) return null;
		
		const requiredPackagesString = lineParts[1];
		const requiredPackagesStrings = requiredPackagesString.split(/\s*,\s*/);
		
		const requiredPackages = requiredPackagesStrings.map(requiredPackageString => {
			const requiredPackageParts = /^([^\s]+)@([^@\s]+)$/.exec(requiredPackageString);
			
			if (!requiredPackageParts) return null;
			
			return {
				name: requiredPackageParts[1],
				version: requiredPackageParts[2]
			};
		})
		
		const validRequiredPackages = requiredPackages
			.filter(requiredPackage => requiredPackage); // silently ignores errors. not great!
		
		return new RequireHeaderLine({
			requiredPackages: validRequiredPackages
		});
	}
};
