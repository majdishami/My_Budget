const webpack = require('webpack');
const path = require('path');

module.exports = function override(config, env) {
  // Add or modify Webpack plugins
  config.plugins = (config.plugins || []).concat([
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
  ]);

  // Add or modify Webpack resolve
  config.resolve = {
    ...config.resolve,
    alias: {
      zlib: require.resolve('browserify-zlib'),
      querystring: require.resolve('querystring-es3'),
      path: require.resolve('path-browserify'),
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      http: require.resolve('stream-http'),
      url: require.resolve('url/'),
      util: require.resolve('util/'),
      buffer: require.resolve('buffer/'),
      '@': path.resolve(__dirname, 'src'), // Added alias
    },
    fallback: {
      process: require.resolve('process/browser'),
    },
  };

  return config;
};