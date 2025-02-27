import { resolve } from 'path';
import webpack from 'webpack';

export default function override(config) {
  config.resolve.fallback = {
    zlib: require.resolve('browserify-zlib'),
    querystring: require.resolve('querystring-es3'),
    path: require.resolve('path-browserify'),
    crypto: require.resolve('crypto-browserify'),
    fs: false,
    stream: require.resolve('stream-browserify'),
    http: require.resolve('stream-http'),
    net: false,
    tls: false,
    url: require.resolve('url/'),
    util: require.resolve('util/'),
    buffer: require.resolve('buffer/'),
    dns: false,
    async_hooks: false,
    pg_native: false,
  };

  config.plugins = (config.plugins || []).concat([
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
  ]);

  return config;
}