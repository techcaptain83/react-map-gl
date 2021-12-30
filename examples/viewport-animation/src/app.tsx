import * as React from 'react';
import {useRef, useCallback} from 'react';
import {render} from 'react-dom';
import Map, {MapRef} from 'react-map-gl';

import ControlPanel from './control-panel';

const MAPBOX_TOKEN = ''; // Set your mapbox token here

const initialViewState = {
  latitude: 37.7751,
  longitude: -122.4193,
  zoom: 11,
  bearing: 0,
  pitch: 0
};

export default function App() {
  const mapRef = useRef<MapRef>();

  const onSelectCity = useCallback(({longitude, latitude}) => {
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      map.flyTo({center: [longitude, latitude]});
    }
  }, []);

  return (
    <>
      <Map
        ref={mapRef}
        initialViewState={initialViewState}
        mapStyle="mapbox://styles/mapbox/light-v9"
        mapboxAccessToken={MAPBOX_TOKEN}
      />
      <ControlPanel onSelectCity={onSelectCity} />
    </>
  );
}

export function renderToDom(container) {
  render(<App />, container);
}
