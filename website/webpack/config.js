const {resolve} = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

// Otherwise modules imported from outside this directory does not compile
// Seems to be a Babel bug
// https://github.com/babel/babel-loader/issues/149#issuecomment-191991686
const BABEL_CONFIG = {
  presets: [
    'es2015',
    'react',
    'stage-2'
  ].map(function configMap(name) {
    return require.resolve(`babel-preset-${name}`);
  }),
  plugins: [
    'transform-decorators-legacy'
  ].map(function configMap(name) {
    return require.resolve(`babel-plugin-${name}`);
  })
};

module.exports = {

  entry: ['./src/main'],

  module: {
    rules: [{
      test: /\.js$/,
      exclude: [/node_modules/],
      use: [{
        loader: 'babel-loader',
        options: BABEL_CONFIG
      }]
    }, {
      test: /\.scss$/,
      loaders: ['style-loader', 'css-loader', 'sass-loader', 'autoprefixer-loader']
    }, {
      test: /\.(eot|svg|ttf|woff|woff2|gif|jpe?g|png)$/,
      loader: 'url-loader'
    }],

    // Uglify seems to be incompatible with mapbox
    // https://github.com/mapbox/mapbox-gl-js/issues/4359#issuecomment-288001933
    noParse: /(mapbox-gl)\.js$/
  },

  resolve: {
    modules: [
      // Always resolve module to root dependencies first
      resolve('../node_modules'),
      resolve('./node_modules')
    ],
    alias: {
      'react-map-gl': resolve('../src'),
      '../utils/mapboxgl': resolve('../node_modules/mapbox-gl/dist/mapbox-gl-dev.js'),
    }
  },

  node: {
    fs: 'empty'
  },

  plugins: [
    new webpack.EnvironmentPlugin(['MapboxAccessToken']),
    new CopyWebpackPlugin([
      // This will copy the contents to the distribution bundle folder
      {
        from: '../docs',
        to: 'docs'
      },
      {
        from: '../examples/data',
        to: 'data'
      },
      {
        from: './src/static'
      }
    ])
  ]

};
