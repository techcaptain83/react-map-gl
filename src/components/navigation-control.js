// @flow
import * as React from 'react';
import {useMemo} from 'react';
import PropTypes from 'prop-types';

import MapState from '../utils/map-state';
import {LINEAR_TRANSITION_PROPS} from '../utils/map-controller';

import {compareVersions} from '../utils/version';

import useMapControl, {mapControlDefaultProps, mapControlPropTypes} from './use-map-control';

import type {MapControlProps} from './use-map-control';

const noop = () => {};

const propTypes = Object.assign({}, mapControlPropTypes, {
  // Custom className
  className: PropTypes.string,
  // Callbacks fired when the user interacted with the map. The object passed to the callbacks
  // contains viewport properties such as `longitude`, `latitude`, `zoom` etc.
  onViewStateChange: PropTypes.func,
  onViewportChange: PropTypes.func,
  // Show/hide compass button
  showCompass: PropTypes.bool,
  // Show/hide zoom buttons
  showZoom: PropTypes.bool,
  // Custom labels assigned to the controls
  zoomInLabel: PropTypes.string,
  zoomOutLabel: PropTypes.string,
  compassLabel: PropTypes.string
});

const defaultProps = Object.assign({}, mapControlDefaultProps, {
  className: '',
  showCompass: true,
  showZoom: true,
  zoomInLabel: 'Zoom In',
  zoomOutLabel: 'Zoom Out',
  compassLabel: 'Reset North'
});

export type NavigationControlProps = MapControlProps & {
  className: string,
  onViewStateChange?: Function,
  onViewportChange?: Function,
  showCompass: boolean,
  showZoom: boolean,
  zoomInLabel: string,
  zoomOutLabel: string,
  compassLabel: string
};

type ViewportProps = {
  longitude: number,
  latitude: number,
  zoom: number,
  pitch: number,
  bearing: number
};

// Mapbox version flags. CSS classes were changed in certain versions.
const VERSION_LEGACY = 1;
const VERSION_1_6 = 2;

function getUIVersion(mapboxVersion: string): number {
  return compareVersions(mapboxVersion, '1.6.0') >= 0 ? VERSION_1_6 : VERSION_LEGACY;
}

function updateViewport(context, props, opts: $Shape<ViewportProps>) {
  const {viewport} = context;
  const mapState = new MapState(Object.assign({}, viewport, opts));
  const viewState = Object.assign({}, mapState.getViewportProps(), LINEAR_TRANSITION_PROPS);

  const onViewportChange = props.onViewportChange || context.onViewportChange || noop;
  const onViewStateChange = props.onViewStateChange || context.onViewStateChange || noop;

  // Call new style callback
  onViewStateChange({viewState});

  // Call old style callback
  onViewportChange(viewState);
}

function renderButton(type: string, label: string, callback: Function, children: any) {
  return (
    <button
      key={type}
      className={`mapboxgl-ctrl-icon mapboxgl-ctrl-${type}`}
      type="button"
      title={label}
      onClick={callback}
    >
      {children || <span className="mapboxgl-ctrl-icon" aria-hidden="true" />}
    </button>
  );
}

function renderCompass(context) {
  const uiVersion = useMemo(() => (context.map ? getUIVersion(context.map.version) : VERSION_1_6), [
    context.map
  ]);

  const {bearing} = context.viewport;
  const style = {transform: `rotate(${-bearing}deg)`};

  return uiVersion === VERSION_1_6 ? (
    <span className="mapboxgl-ctrl-icon" aria-hidden="true" style={style} />
  ) : (
    <span className="mapboxgl-ctrl-compass-arrow" style={style} />
  );
}

/*
 * PureComponent doesn't update when context changes, so
 * implementing our own shouldComponentUpdate here.
 */
function NavigationControl(props: NavigationControlProps) {
  const {context, containerRef} = useMapControl(props);

  const onZoomIn = () => {
    updateViewport(context, props, {zoom: context.viewport.zoom + 1});
  };

  const onZoomOut = () => {
    updateViewport(context, props, {zoom: context.viewport.zoom - 1});
  };

  const onResetNorth = () => {
    updateViewport(context, props, {bearing: 0, pitch: 0});
  };

  const {className, showCompass, showZoom, zoomInLabel, zoomOutLabel, compassLabel} = props;

  return (
    <div className={`mapboxgl-ctrl mapboxgl-ctrl-group ${className}`} ref={containerRef}>
      {showZoom && renderButton('zoom-in', zoomInLabel, onZoomIn)}
      {showZoom && renderButton('zoom-out', zoomOutLabel, onZoomOut)}
      {showCompass && renderButton('compass', compassLabel, onResetNorth, renderCompass(context))}
    </div>
  );
}

NavigationControl.propTypes = propTypes;
NavigationControl.defaultProps = defaultProps;

export default NavigationControl;
