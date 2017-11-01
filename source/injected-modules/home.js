const os = require('os');

const Item = require('../Item');

module.exports = Item.itemForPath(os.homedir());
