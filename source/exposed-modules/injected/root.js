/* Exposes the root of the file system, as a Folder. */

const path = require('path');

const Item = require('../Item');

const rootPath = process.cwd().split(path.sep)[0] + path.sep;

module.exports = Item._itemForPath(rootPath);
