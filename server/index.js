
// This file is a simple wrapper that loads the TypeScript version using ts-node
require('ts-node/register');
// Use a relative path to ensure correct resolution
module.exports = require('./index.ts');
