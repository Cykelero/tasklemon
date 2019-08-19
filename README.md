# <img alt="Tasklemon" src="docs/readme-logo.png" width=250 height=42>

*Painlessly automate in JavaScript.*

Write scripts that manipulate files, make network requests, get user input, all with a delightfully clear API. If you want to script things but don't want to use Bash, Tasklemon is what you've been wishing for all along! ✨

Here's what a script to delete files based on their extension might look like:

````js
// Declare what arguments we accept
cli.accept({
	targetFolder: ['-t --target', Folder],
	extensionFilter: ['-f --filter', String]
});

const targetFolder = cli.args.targetFolder; // `targetFolder` has been cast to Folder automatically
const extensionFilter = cli.args.extensionFilter || 'tmp';

cli.tell(`Removing ${extensionFilter} items from ${targetFolder.name}...`);

// Filter and delete files
const matchingChildren = targetFolder.children
	.filter(child => child.extension === extensionFilter);

matchingChildren.forEach(child => child.delete()); // move matching items to trash

cli.tell('Removed ' + format.number.integer(matchingChildren.length, 'item')); // “Removed 13 items”
````

And with Tasklemon installed, you can just save this code into a file (say, `clean.js`) and run it in a single command; no imports, no preprocessing:

````bash
$ lemon clean.js --target some-folder
````

(you can also give the appropriate permissions to your scripts to make them directly executable, if you want; see below in [Shebang and runtime pinning](#shebang-and-runtime-pinning))

## Sections

- [Usage](#usage)
- [Learning](#learning)
- [Samples](#samples)
- [Caveats](#caveats)
- [Contributing](#contributing)
- [Thanks](#thanks)

## Usage

### Installing

With Node.js present, install Tasklemon globally by running `npm install -g tasklemon`. This will make it available as `lemon` on the command&nbsp;line.

Tasklemon supports macOS, Linux, and (for the most part) Windows.

### Writing and running a script

To use Tasklemon, write a script and save it into a file, then execute it by running `lemon your-script.js`. At runtime, Tasklemon exposes its entry points to your script, so you don't have to import anything. It also wraps all your code in an `async` function call, so that you can `await` promises wherever.

### Shebang and runtime pinning

When you run a script for the first time, Tasklemon will insert a shebang line at the top, which serves two purposes:

- If the script has the proper permissions, it becomes executable itself.
	Apply the permissions using `chmod u+x your-script.js`, and you will be able to execute the script by running `./your-script.js` directly.
- The shebang contains the current version number of Tasklemon: this makes sure your script can be properly executed by future versions of the runtime.

## Learning

To get started, I recommend you look at [the examples](#samples) below. They'll give you a good idea of the main features of Tasklemon.

After that, you can use the [API reference](http://cykelero.github.io/tasklemon/api/) to find what you need. The reference is approachable, straightforward, and replete with clear examples. Here's a sample of what it looks like:

<a href="https://cykelero.github.io/tasklemon/api/latest/File.html#appendLine"><img src="docs/readme-api-reference-screenshot.png" alt width=838></a>

## Samples

### Writing and reading files

Add some text to a log file in the current working directory:

````js
here.file('events.log').appendLine('Operation complete.');
````

Read JSON from a file:

````js
const packageInfo = here.file('package.json').getContentAs(Object);
cli.tell(`The current project is ${packageInfo.name}.`);
````

### Declaring and getting script parameters

````js
cli.accept({
    username: ['--name', String, 'Name of user to add'],
    isAdmin: ['-a', Boolean, 'Make user an admin']
});

console.log(cli.args); // will be {username: 'Rose', isAdmin: true}
````

Then, run the script:

````bash
$ lemon adduser.js -a --name Rose
````

### Format data for display

Display a relative timestamp:

````js
const logDate = here.file('log.txt').dateModified;
cli.tell(format.date.relative(logDate)); // “3 minutes ago”
````

Display a number and pluralize its unit:

````js
cli.tell(format.number(1, 'carrot')); // “1.00 carrot”
cli.tell(format.number(4528.5, 'carrot')); // “4,528.50 carrots”
````

### Get JSON from a URL

````js
const tasklemonNpmDetails = await net.getJSON('https://registry.npmjs.org/tasklemon');
const lastReleaseDate = tasklemonNpmDetails.time.modified;

cli.tell('Last Tasklemon release was ' + format.date.relative(lastReleaseDate) + '.');
````

### Use the `dedupe` npm package

There is no need to ever install, or even import packages prior to using them.

````js
const friendNames = await cli.ask('What are your friends called?', Array);
const uniqueFriendNames = npm.dedupe(friendNames);

cli.tell('Total count of unique friend names: ' + uniqueFriendNames.length);
````

## Caveats

I really want Tasklemon to be lovely, but here are a few ways in which it's not.

- Tasklemon is still very young. It's got a (partial) test suite, sure, but it hasn't seen much real-world usage yet: expect breaking changes, and bugs. (please do [report these](https://github.com/Cykelero/tasklemon/issues/new)!)
- By design, file operations are synchronous—just like in bash scripting, for example. That's great for usability, but you're not going to write concurrent server stuff this way.
- Symlinks aren't very well-supported yet. Just traversing them should be fine, but directly manipulating them will be weird.
- While Tasklemon does support Windows, a few features are missing, such as permission manipulation.

## Contributing

Want to help build Tasklemon? It's not too hard!

Clone Tasklemon and run `npm install`. You can then:

- **try out your version of Tasklemon** by running `source/tasklemon.js some-script.js`
- **run the tests** using `npm run test` (or `npm run watch:test` for automatic runs)
- **build the api docs** using `npm run build-docs` (or `npm run watch:build-docs` for automatic builds)

## Thanks

Thanks to [Fabien Bérini](https://fabien-berini.fr), for his help with making the unix-y parts reasonably sane :)  
Thanks to [Benoît Zugmeyer](https://github.com/BenoitZugmeyer), for his input on API design and npm support :)
