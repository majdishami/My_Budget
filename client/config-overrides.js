import { resolve } from 'path';
import webpack from 'webpack';

export default function override(config) {
  config.resolve.fallback = {
    zlib: resolve('browserify-zlib'),
    querystring: resolve('querystring-es3'),
    path: resolve('path-browserify'),
    crypto: resolve('crypto-browserify'),
    fs: false,
    stream: resolve('stream-browserify'),
    http: resolve('stream-http'),
    net: false,
    tls: false,
    url: resolve('url/'),
    util: resolve('util/'),
    buffer: resolve('buffer/'),
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