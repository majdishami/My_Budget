
// This file is a wrapper that loads the TypeScript version using ts-node
require('ts-node/register');
// Use relative path with explicit ES module support
process.env.NODE_OPTIONS = '--experimental-specifier-resolution=node';
// Set ES module flag for Node.js
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
// Use proper path resolution
module.exports = require('./index.ts');
