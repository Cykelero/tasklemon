const path = require('path');

const Environment = require('./Environment');
const Item = require('../Item');

const folderPath = path.parse(Environment.sourceScriptPath).dir;
module.exports = Item._itemForPath(path.join(folderPath, path.sep));
