#!/usr/bin/env node
/* Exposed on the PATH. Allows specifying Tasklemon version in a script's shebang. */

process.env.TASKLEMON_RUNTIME_VERSION = '0.6';
require('../tasklemon');
