const ScriptEnvironment = require('../ScriptEnvironment');
const Item = require('../Item');

module.exports = Item._itemForPath(ScriptEnvironment.sourceScriptPath);
