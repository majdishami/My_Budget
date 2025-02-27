const { paths } = require('react-app-rewired/scripts/utils/paths');

(async () => {
  const override = await import(paths.appPath + '/client/config-overrides.js');
  module.exports = override.default;
})();