# <img alt="Tasklemon" src="docs/readme-logo.png" width=254 height=42>
<sup>🛠 </sup>[<sup>Usage</sup>](#-usage)<sup>   📚 </sup>[<sup>Learning</sup>](#-learning)<sup>   ☀️ </sup>[<sup>Samples</sup>](#%EF%B8%8F-samples)<sup>   💬 </sup>[<sup>Caveats</sup>](#-caveats)<sup>   👩🏿‍💻 </sup>[<sup>Contributing</sup>](#-contributing)<sup>   ❤️ </sup>[<sup>Thanks</sup>](#%EF%B8%8F-thanks)<sup></sup>

Write scripts that manipulate files, make network requests, get user input, all with a delightfully clear API and exceptional documentation. If you want to script things but don't want to use Bash, Tasklemon is what you've been wishing for all along! ✨

Here's a simple script, written in both Tasklemon and in vanilla Node:

<table>
	<thead>
		<th>
			🍋 Tasklemon
		</th>
		<th>
			✳️ Node.js
		</th>
	</thead>
	<tr>
		<td>
<pre lang="javascript">
home.children.forEach(child => {
    if (child.extension === 'tmp') child.delete();
});
 
 
 
 
 
 
 
 
</pre>
		</td>
		<td>
<pre lang="javascript">
const fs = require('fs');
const os = require('os');
const path = require('path');
 
const homePath = os.homedir();
fs.readdirSync(homePath).forEach(childName => {
    if (path.parse(childName).ext === '.tmp') {
        const absolutePath = path.join(homePath, childName);
        fs.unlinkSync(absolutePath);
    }
});
</pre>
		</td>
	</tr>
</table>


And with Tasklemon installed, you can just save this code into a file (say, `clean.js`) and run it in a single command; no imports, no preprocessing:

```bash
$ lemon clean.js
```

(you can also give the appropriate permissions to your scripts to make them directly executable, if you want; see below in [Shebang and runtime pinning](#shebang-and-runtime-pinning))

## 🛠 Usage

### Installing Tasklemon

With [Node.js](https://nodejs.org/) present, install Tasklemon globally by running `npm install -g tasklemon`. This will make it available as `lemon` on the command&nbsp;line.

Tasklemon supports macOS, Linux, and (with a few caveats) Windows.

### Writing and running a script

To use Tasklemon, write a script and save it into a file, then execute it by running `lemon your-script.js`.  
At runtime, Tasklemon exposes its entry points to your script, so you don't have to import anything. It also wraps all your code in an `async` function call, so that you can `await` promises wherever.  
To get a feel of what's possible, have a look at [the examples](#%EF%B8%8F-samples) below.

### Debugging a script

Node.js supports debugging through V8's inspector protocol. To debug a Tasklemon script:

1. Run the script with the `--inspect-brk` flag specified.  
Make sure the flag is before the script's name, so that it is consumed by Tasklemon itself: `lemon --inspect-brk your-script.js`
2. Open [a compatible client](https://nodejs.org/en/docs/guides/debugging-getting-started/#inspector-clients), such as Google Chrome's DevTools, or Visual Studio Code, and connect to the Node process.  
For instance, in Google Chrome, this means navigating to `chrome://inspect`, then clicking “inspect” under “Remote Target”.

### Shebang and runtime pinning

When you run a script for the first time, Tasklemon will insert two lines at the top:

- A shebang, which makes the script executable directly, once it has the proper permissions.  
	Apply the permissions using `chmod u+x your-script.js`, and you will be able to execute the script by running `./your-script.js` directly.
- A version header, with the current version number of Tasklemon: this makes sure your script can be properly executed by future versions of the runtime.

## 📚 Learning

After you've [installed Tasklemon](#-usage), I recommend you look at [the examples](#%EF%B8%8F-samples) below. They'll give you a good idea of the main features you'll want to use.

After that, you can use the [API reference](http://cykelero.github.io/tasklemon/api/) to find what you need. The reference is approachable, straightforward, and replete with clear examples. Here's a sample of what it looks like:

<a href="https://cykelero.github.io/tasklemon/api/latest/File.html#appendLine"><img src="docs/readme-api-reference-screenshot.png" alt width=838></a>

## ☀️ Samples

### Write and read files

Add some text to a log file in the current working directory:

```js
here.file('events.log').appendLine('Operation complete.');
```

Read JSON from a file:

```js
const packageInfo = here.file('package.json').getContentAsJSON();
cli.tell(`The current project is ${packageInfo.name}.`);
```

Use an absolute path:

```js
const directXLog = File('C:/Windows/DirectX.log'); // on Windows, drive letter can be specified
const lastLogDate = directXLog.dateModified;

cli.tell('The last DirectX install happened ' + format.date.relative(lastLogDate) + '.');
```

### Declare script parameters, get the values

```js
cli.accept({
    username: ['--name', String, 'Name of user to add'],
    isAdmin: ['-a', Boolean, 'Make user an admin']
});

console.log(cli.args); // will be {username: 'Rose', isAdmin: true}
```

Then, run the script:

```bash
$ lemon adduser.js -a --name=Rose
```

### Format data for display

Display a relative timestamp:

```js
const logDate = here.file('log.txt').dateModified;
cli.tell(format.date.relative(logDate)); // “3 minutes ago”
```

Display a number and pluralize its unit:

```js
cli.tell(format.number(1, 'carrot')); // “1.00 carrot”
cli.tell(format.number(4528.5, 'carrot')); // “4,528.50 carrots”
```

### Get JSON from a URL

You can use `await` at the top level of your scripts.

```js
const tasklemonNpmDetails = await net.getJSON('https://registry.npmjs.org/tasklemon');
const lastReleaseDate = tasklemonNpmDetails.time.modified;

cli.tell('Last Tasklemon release was ' + format.date.relative(lastReleaseDate) + '.');
```

### Use the `dedupe` npm package

There is no need to ever install, or even import packages prior to using them.

```js
const friendNames = await cli.ask('What are your friends called?', Array);
const uniqueFriendNames = npm.dedupe(friendNames);

cli.tell('Total count of unique friend names: ' + uniqueFriendNames.length);
```

## 💬 Caveats

I really want Tasklemon to be terrific, but here are a few ways in which it's not.

- Tasklemon is still young. It's got a (partial) test suite, sure, but it hasn't seen much real-world usage yet: expect breaking changes, and bugs. (please do [report these](https://github.com/cykelero/tasklemon/issues/new)!)
- By design, file operations are synchronous—just like in bash scripting, for example. That's great for usability, but you're not going to write concurrent server stuff this way.
- When importing npm packages, only CommonJS is supported. ESM, the newer standard that is becoming more popular, isn't supported yet. This means you sometimes need to [use an older version](https://cykelero.github.io/tasklemon/api/latest/npm.html#specifying-versions) of a package.
- Symlinks aren't very well-supported yet. Just traversing them should be fine, but directly manipulating them will be weird.
- On Windows, a few features are missing, such as permission manipulation.

## 👩🏿‍💻 Contributing

Want to help build Tasklemon? That'd be lovely!  
The simplest way to help is give feedback on what it's like to use Tasklemon. All comments are greatly appreciated! You can [open an issue](https://github.com/cykelero/tasklemon/issues/new) on GitHub, or maybe just drop me a note [on Mastodon](https://mas.to/@Cykelero).

To go one step further, you can directly work on the code.  
Clone Tasklemon from Github and run `npm install`. You can then:

- **try out your version of Tasklemon** by running `source/tasklemon.js some-script.js`
- **run the tests** using `npm run test` (or `npm run watch:test` for automatic runs)
- **build the api docs** using `npm run build-docs` (or `npm run watch:build-docs` for automatic builds)

Once you've built something nice, [submit it as a pull request](https://github.com/cykelero/tasklemon/compare) to make it public.

## ❤️ Thanks

Thanks to [Fabien Bérini](https://fabien-berini.fr), for his help with making the unix-y parts reasonably sane :)  
Thanks to [Benoît Zugmeyer](https://github.com/BenoitZugmeyer), for his input on API design and npm support :)
