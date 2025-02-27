const path = require('path');

(async () => {
  const override = await import(path.resolve(__dirname, 'client', 'config-overrides.js'));
  module.exports = override.default;
})();