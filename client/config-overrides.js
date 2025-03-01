const webpack = require('webpack');
<<<<<<< HEAD
const path = require('path');
=======
>>>>>>> a01ac073900f62162a97a032d9aa4f896c838032

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
<<<<<<< HEAD
      '@': path.resolve(__dirname, 'src'), // Added alias
=======
>>>>>>> a01ac073900f62162a97a032d9aa4f896c838032
    },
    fallback: {
      process: require.resolve('process/browser'),
    },
  };

  return config;
};