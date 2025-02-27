const path = require('path');

(async () => {
  const override = await import(path.resolve(__dirname, './config-overrides.js'));
  module.exports = override.default;
})();