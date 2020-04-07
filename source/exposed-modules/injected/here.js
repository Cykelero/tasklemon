/* Exposes the current working directory, as a Folder. */

const path = require('path');

const Item = require('../Item');

module.exports = Item._itemForPath(path.join(process.cwd(), path.sep));
