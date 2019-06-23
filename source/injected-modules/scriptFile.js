const Environment = require('./Environment');
const Item = require('../Item');

module.exports = Item._itemForPath(Environment.sourceScriptPath);
