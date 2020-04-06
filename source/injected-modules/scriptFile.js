/* Exposes the currently running TL script, as a File. */

const ScriptEnvironment = require('../ScriptEnvironment');
const Item = require('../Item');

module.exports = Item._itemForPath(ScriptEnvironment.sourceScriptPath);
