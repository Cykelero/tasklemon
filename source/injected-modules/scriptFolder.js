/* Exposes the parent of the currently running TL script, as a Folder. */

const path = require('path');

const ScriptEnvironment = require('../ScriptEnvironment');
const Item = require('../Item');

const folderPath = path.parse(ScriptEnvironment.sourceScriptPath).dir;
module.exports = Item._itemForPath(path.join(folderPath, path.sep));
