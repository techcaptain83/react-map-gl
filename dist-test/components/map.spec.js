// import MapGL from 'react-map-gl';
import React from 'react';
import DefaultMapGL, {MapGL} from 'react-map-gl';
import test from 'tape-catch';
import ReactTestUtils from 'react-addons-test-utils';

// This depends on the bundler inmporting this correctly
var mapboxApiAccessToken =
    process.env.MapboxAccessToken || process.env.MAPBOX_ACCESS_TOKEN; // eslint-disable-line

/* eslint-disable func-names, no-shadow */
test('MapGL', function(t) {
  t.test('default export', function(t) {
    t.ok(DefaultMapGL, 'MapGL is defined');

    var map = (
      React.createElement( DefaultMapGL, {
        width: 500, height: 500, longitude: -122, latitude: 37, zoom: 14, mapboxApiAccessToken: mapboxApiAccessToken })
    );

    var renderer = ReactTestUtils.createRenderer();
    renderer.render(map);
    var result = renderer.getRenderOutput();

    t.equal(result.type, 'div', 'MapGL rendered a div');
    t.end();
  });

  t.test('named export', function(t) {
    t.ok(MapGL, 'MapGL is defined');

    var map = (
      React.createElement( MapGL, {
        width: 500, height: 500, longitude: -122, latitude: 37, zoom: 14, mapboxApiAccessToken: mapboxApiAccessToken })
    );

    var renderer = ReactTestUtils.createRenderer();
    renderer.render(map);
    var result = renderer.getRenderOutput();

    t.equal(result.type, 'div', 'MapGL rendered a div');
    t.end();
  });
});
/* eslint-enable func-names */
