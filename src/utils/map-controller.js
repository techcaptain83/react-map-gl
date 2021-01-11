// Copyright (c) 2015 Uber Technologies, Inc.

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import MapState from './map-state';
import {LinearInterpolator} from './transition';
import TransitionManager, {TRANSITION_EVENTS} from './transition-manager';

const NO_TRANSITION_PROPS = {
  transitionDuration: 0
};
export const LINEAR_TRANSITION_PROPS = {
  transitionDuration: 300,
  transitionEasing: t => t,
  transitionInterpolator: new LinearInterpolator(),
  transitionInterruption: TRANSITION_EVENTS.BREAK
};

// EVENT HANDLING PARAMETERS
const PITCH_MOUSE_THRESHOLD = 5;
const PITCH_ACCEL = 1.2;
const ZOOM_ACCEL = 0.01;

const EVENT_TYPES = {
  WHEEL: ['wheel'],
  PAN: ['panstart', 'panmove', 'panend'],
  PINCH: ['pinchstart', 'pinchmove', 'pinchend', 'pinchcancel'],
  DOUBLE_TAP: ['doubletap'],
  KEYBOARD: ['keydown']
};

/**
 * @classdesc
 * A class that handles events and updates mercator style viewport parameters
 */
export default class MapController {
  events = [];
  scrollZoom = true;
  dragPan = true;
  dragRotate = true;
  doubleClickZoom = true;
  touchZoom = true;
  touchRotate = false;
  keyboard = true;

  _state = {
    isDragging: false
  };
  _events = {};
  _transitionManager = new TransitionManager();

  constructor() {
    this.handleEvent = this.handleEvent.bind(this);
  }

  /**
   * Callback for events
   * @param {object} event - a mjolnir.js Event
   */
  handleEvent(event) {
    this.mapState = this.getMapState();

    switch (event.type) {
      case 'panstart':
        return this._onPanStart(event);
      case 'panmove':
        return this._onPan(event);
      case 'panend':
        return this._onPanEnd(event);
      case 'pinchstart':
        return this._onPinchStart(event);
      case 'pinchmove':
        return this._onPinch(event);
      case 'pinchcancel':
      case 'pinchend':
        return this._onPinchEnd(event);
      case 'doubletap':
        return this._onDoubleTap(event);
      case 'wheel':
        return this._onWheel(event);
      case 'keydown':
        return this._onKeyDown(event);
      default:
        return false;
    }
  }

  /* Event utils */
  // Event object: http://hammerjs.github.io/api/#event-object
  getCenter(event) {
    const {
      offsetCenter: {x, y}
    } = event;
    return [x, y];
  }

  isFunctionKeyPressed(event) {
    const {srcEvent} = event;
    return Boolean(srcEvent.metaKey || srcEvent.altKey || srcEvent.ctrlKey || srcEvent.shiftKey);
  }

  setState = newState => {
    Object.assign(this._state, newState);
    if (this.onStateChange) {
      this.onStateChange(this._state);
    }
  };

  /* Callback util */
  // formats map state and invokes callback function
  updateViewport(newMapState, extraProps = {}, extraState = {}) {
    // Always trigger callback on initial update (resize)
    const oldViewport = this.mapState ? this.mapState.getViewportProps() : {};
    const newViewport = Object.assign({}, newMapState.getViewportProps(), extraProps);

    const viewStateChanged = Object.keys(newViewport).some(
      key => oldViewport[key] !== newViewport[key]
    );

    // viewState has changed
    if (viewStateChanged) {
      this.onViewportChange(newViewport, extraState, oldViewport);
    }

    this.setState(Object.assign({}, newMapState.getInteractiveState(), extraState));
  }

  getMapState(overrides) {
    return new MapState(Object.assign({}, this.mapStateProps, this._state, overrides));
  }

  /**
   * Extract interactivity options
   */
  /* eslint-disable complexity */
  setOptions(options) {
    const {
      onViewportChange,
      onStateChange,
      eventManager = this.eventManager,

      isInteractive = true,
      scrollZoom = this.scrollZoom,
      dragPan = this.dragPan,
      dragRotate = this.dragRotate,
      doubleClickZoom = this.doubleClickZoom,
      touchZoom = this.touchZoom,
      touchRotate = this.touchRotate,
      keyboard = this.keyboard
    } = options;

    this.onViewportChange = onViewportChange;
    this.onStateChange = onStateChange;

    const dimensionChanged = !this.mapStateProps || this.mapStateProps.height !== options.height;

    this.mapStateProps = options;

    if (dimensionChanged && options.height) {
      // Dimensions changed, normalize the props
      this.updateViewport(new MapState(options));
    }
    // Update transition
    this._transitionManager.processViewportChange(
      Object.assign({}, options, {
        onStateChange: this.setState
      })
    );

    if (this.eventManager !== eventManager) {
      // EventManager has changed
      this.eventManager = eventManager;
      this._events = {};
      this.toggleEvents(this.events, true);
    }

    // Register/unregister events
    this.toggleEvents(EVENT_TYPES.WHEEL, isInteractive && scrollZoom);
    this.toggleEvents(EVENT_TYPES.PAN, isInteractive && (dragPan || dragRotate));
    this.toggleEvents(EVENT_TYPES.PINCH, isInteractive && (touchZoom || touchRotate));
    this.toggleEvents(EVENT_TYPES.DOUBLE_TAP, isInteractive && doubleClickZoom);
    this.toggleEvents(EVENT_TYPES.KEYBOARD, isInteractive && keyboard);

    // Interaction toggles
    this.scrollZoom = scrollZoom;
    this.dragPan = dragPan;
    this.dragRotate = dragRotate;
    this.doubleClickZoom = doubleClickZoom;
    this.touchZoom = touchZoom;
    this.touchRotate = touchRotate;
    this.keyboard = keyboard;
  }
  /* eslint-enable complexity */

  toggleEvents(eventNames, enabled) {
    if (this.eventManager) {
      eventNames.forEach(eventName => {
        if (this._events[eventName] !== enabled) {
          this._events[eventName] = enabled;
          if (enabled) {
            this.eventManager.on(eventName, this.handleEvent);
          } else {
            this.eventManager.off(eventName, this.handleEvent);
          }
        }
      });
    }
  }

  /* Event handlers */
  // Default handler for the `panstart` event.
  _onPanStart(event) {
    const pos = this.getCenter(event);
    const newMapState = this.mapState.panStart({pos}).rotateStart({pos});
    this.updateViewport(newMapState, NO_TRANSITION_PROPS, {isDragging: true});
    return true;
  }

  // Default handler for the `panmove` event.
  _onPan(event) {
    return this.isFunctionKeyPressed(event) || event.rightButton
      ? this._onPanRotate(event)
      : this._onPanMove(event);
  }

  // Default handler for the `panend` event.
  _onPanEnd(event) {
    const newMapState = this.mapState.panEnd().rotateEnd();
    this.updateViewport(newMapState, null, {
      isDragging: false,
      isPanning: false,
      isRotating: false
    });
    return true;
  }

  // Default handler for panning to move.
  // Called by `_onPan` when panning without function key pressed.
  _onPanMove(event) {
    if (!this.dragPan) {
      return false;
    }
    const pos = this.getCenter(event);
    const newMapState = this.mapState.pan({pos});
    this.updateViewport(newMapState, NO_TRANSITION_PROPS, {isPanning: true});
    return true;
  }

  // Default handler for panning to rotate.
  // Called by `_onPan` when panning with function key pressed.
  _onPanRotate(event) {
    if (!this.dragRotate) {
      return false;
    }

    const {deltaX, deltaY} = event;
    const [, centerY] = this.getCenter(event);
    const startY = centerY - deltaY;
    const {width, height} = this.mapState.getViewportProps();

    const deltaScaleX = deltaX / width;
    let deltaScaleY = 0;

    if (deltaY > 0) {
      if (Math.abs(height - startY) > PITCH_MOUSE_THRESHOLD) {
        // Move from 0 to -1 as we drag upwards
        deltaScaleY = (deltaY / (startY - height)) * PITCH_ACCEL;
      }
    } else if (deltaY < 0) {
      if (startY > PITCH_MOUSE_THRESHOLD) {
        // Move from 0 to 1 as we drag upwards
        deltaScaleY = 1 - centerY / startY;
      }
    }
    deltaScaleY = Math.min(1, Math.max(-1, deltaScaleY));

    const newMapState = this.mapState.rotate({deltaScaleX, deltaScaleY});
    this.updateViewport(newMapState, NO_TRANSITION_PROPS, {isRotating: true});
    return true;
  }

  // Default handler for the `wheel` event.
  _onWheel(event) {
    if (!this.scrollZoom) {
      return false;
    }

    event.preventDefault();

    const pos = this.getCenter(event);
    const {delta} = event;

    // Map wheel delta to relative scale
    let scale = 2 / (1 + Math.exp(-Math.abs(delta * ZOOM_ACCEL)));
    if (delta < 0 && scale !== 0) {
      scale = 1 / scale;
    }

    const newMapState = this.mapState.zoom({pos, scale});
    this.updateViewport(
      newMapState,
      Object.assign({}, LINEAR_TRANSITION_PROPS, {
        transitionInterpolator: new LinearInterpolator({around: pos})
      }),
      {isZooming: true}
    );
    return true;
  }

  // Default handler for the `pinchstart` event.
  _onPinchStart(event) {
    const pos = this.getCenter(event);
    const newMapState = this.mapState.zoomStart({pos}).rotateStart({pos});
    // hack - hammer's `rotation` field doesn't seem to produce the correct angle
    this._state.startPinchRotation = event.rotation;
    this.updateViewport(newMapState, NO_TRANSITION_PROPS, {isDragging: true});
    return true;
  }

  // Default handler for the `pinch` event.
  _onPinch(event) {
    if (!this.touchZoom && !this.touchRotate) {
      return false;
    }

    let newMapState = this.mapState;
    if (this.touchZoom) {
      const {scale} = event;
      const pos = this.getCenter(event);
      newMapState = newMapState.zoom({pos, scale});
    }
    if (this.touchRotate) {
      const {rotation} = event;
      const {startPinchRotation} = this._state;
      newMapState = newMapState.rotate({
        deltaScaleX: -(rotation - startPinchRotation) / 180
      });
    }

    this.updateViewport(newMapState, NO_TRANSITION_PROPS, {
      isDragging: true,
      isPanning: this.touchZoom,
      isZooming: this.touchZoom,
      isRotating: this.touchRotate
    });
    return true;
  }

  // Default handler for the `pinchend` event.
  _onPinchEnd(event) {
    const newMapState = this.mapState.zoomEnd().rotateEnd();
    this._state.startPinchRotation = 0;
    this.updateViewport(newMapState, null, {
      isDragging: false,
      isPanning: false,
      isZooming: false,
      isRotating: false
    });
    return true;
  }

  // Default handler for the `doubletap` event.
  _onDoubleTap(event) {
    if (!this.doubleClickZoom) {
      return false;
    }
    const pos = this.getCenter(event);
    const isZoomOut = this.isFunctionKeyPressed(event);

    const newMapState = this.mapState.zoom({pos, scale: isZoomOut ? 0.5 : 2});
    this.updateViewport(
      newMapState,
      Object.assign({}, LINEAR_TRANSITION_PROPS, {
        transitionInterpolator: new LinearInterpolator({around: pos})
      }),
      {isZooming: true}
    );
    return true;
  }

  /* eslint-disable complexity */
  // Default handler for the `keydown` event
  _onKeyDown(event) {
    if (!this.keyboard) {
      return false;
    }
    const funcKey = this.isFunctionKeyPressed(event);
    const {mapStateProps} = this;
    let newMapState;

    switch (event.srcEvent.keyCode) {
      case 189: // -
        if (funcKey) {
          newMapState = this.getMapState({zoom: mapStateProps.zoom - 2});
        } else {
          newMapState = this.getMapState({zoom: mapStateProps.zoom - 1});
        }
        break;
      case 187: // +
        if (funcKey) {
          newMapState = this.getMapState({zoom: mapStateProps.zoom + 2});
        } else {
          newMapState = this.getMapState({zoom: mapStateProps.zoom + 1});
        }
        break;
      case 37: // left
        if (funcKey) {
          newMapState = this.getMapState({
            bearing: mapStateProps.bearing - 15
          });
        } else {
          newMapState = this.mapState.pan({pos: [100, 0], startPos: [0, 0]});
        }
        break;
      case 39: // right
        if (funcKey) {
          newMapState = this.getMapState({
            bearing: mapStateProps.bearing + 15
          });
        } else {
          newMapState = this.mapState.pan({pos: [-100, 0], startPos: [0, 0]});
        }
        break;
      case 38: // up
        if (funcKey) {
          newMapState = this.getMapState({pitch: mapStateProps.pitch + 10});
        } else {
          newMapState = this.mapState.pan({pos: [0, 100], startPos: [0, 0]});
        }
        break;
      case 40: // down
        if (funcKey) {
          newMapState = this.getMapState({pitch: mapStateProps.pitch - 10});
        } else {
          newMapState = this.mapState.pan({pos: [0, -100], startPos: [0, 0]});
        }
        break;
      default:
        return false;
    }
    return this.updateViewport(newMapState, LINEAR_TRANSITION_PROPS);
  }
  /* eslint-enable complexity */
}
