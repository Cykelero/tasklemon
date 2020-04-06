const path = require('path');

const ScriptEnvironment = require('../ScriptEnvironment');
const Item = require('../Item');

const folderPath = path.parse(ScriptEnvironment.sourceScriptPath).dir;
module.exports = Item._itemForPath(path.join(folderPath, path.sep));
