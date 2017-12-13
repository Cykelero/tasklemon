const os = require('os');

const Item = require('../Item');

module.exports = Item._itemForPath(os.homedir());
