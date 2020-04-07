/* Exposes the user's home folder, as a Folder. */

const path = require('path');
const os = require('os');

const Item = require('../Item');

module.exports = Item._itemForPath(path.join(os.homedir(), path.sep));
