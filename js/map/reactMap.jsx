import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Inject styling to theme the Cartodb dark_allow tiles to match the project's arctic blue aesthetic
const customStyle = document.createElement('style');
customStyle.innerHTML = `
  .leaflet-tile-pane {
    filter: sepia(100%) hue-rotate(185deg) saturate(300%) brightness(0.65) contrast(1.1);
  }
`;
document.head.appendChild(customStyle);

// Component to dynamically fit bounds of the route
function MapController({ routeLatLngs, driftLatLngs }) {
  const map = useMap();
  useEffect(() => {
    // Recalculate container size in case Leaflet initialised before the screen was visible
    map.invalidateSize();
    const allLatLngs = [...routeLatLngs, ...driftLatLngs];
    if (allLatLngs.length > 0) {
      const bounds = L.latLngBounds(allLatLngs);
      map.fitBounds(bounds, { padding: [50, 50], animate: true });
    }
  }, [map, routeLatLngs, driftLatLngs]);
  return null;
}

export function ExpeditionMap({ expedition, onWaypointTap }) {
  const routeWaypoints = expedition.route || [];
  const routeLatLngs = routeWaypoints.map(wp => [wp.lat, wp.lon]);
  
  const driftWaypoints = expedition.driftPath || [];
  const driftLatLngs = driftWaypoints.map(dp => [dp.lat, dp.lon]);

  const customIcon = new L.DivIcon({
    className: 'custom-waypoint',
    html: `<div style="background-color: #F4F9FC; border: 1px solid #7EB8D4; border-radius: 50%; width: 10px; height: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5]
  });

  return (
    <MapContainer
      center={[-40, -10]}
      zoom={3}
      style={{ width: '100%', height: '100%', background: '#070f1c' }}
      zoomControl={false}
      worldCopyJump={true}
      attributionControl={false}
      dragging={true}
      touchZoom={true}
      scrollWheelZoom={true}
      tap={false}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap &copy; CARTO'
        url='https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      />
      <MapController routeLatLngs={routeLatLngs} driftLatLngs={driftLatLngs} />
      <MapInstanceCapture />
      
      {routeLatLngs.length > 0 && (
        <Polyline 
          positions={routeLatLngs} 
          pathOptions={{ color: '#7EB8D4', weight: 2, opacity: 0.8, dashArray: '10, 10' }} 
        />
      )}
      
      {driftLatLngs.length > 0 && (
        <Polyline 
          positions={driftLatLngs} 
          pathOptions={{ color: '#4A90B8', weight: 1.5, opacity: 0.6, dashArray: '3, 6' }} 
        />
      )}

      {routeWaypoints.map((wp, idx) => (
        <Marker 
          key={idx} 
          position={[wp.lat, wp.lon]} 
          icon={customIcon}
          eventHandlers={{ click: () => onWaypointTap && onWaypointTap(wp) }}
        >
          <Popup>
            <div style={{ color: '#111', fontFamily: 'Courier New, monospace', padding: '4px' }}>
              <strong style={{ color: '#070F1C' }}>{wp.label}</strong><br/>
              <small style={{ color: '#666' }}>{wp.date}</small>
              {wp.fact && <p style={{ marginTop: '6px', fontFamily: '"Cormorant Garamond", serif', fontSize: '14px' }}>{wp.fact}</p>}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

let root = null;
let currentMapDiv = null;
let leafletMapInstance = null;

function MapInstanceCapture() {
  const map = useMap();
  useEffect(() => {
    leafletMapInstance = map;
    // Call again after the screen fade-in transition completes (~380ms)
    const t = setTimeout(() => map.invalidateSize(), 420);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

export function mountReactMap(containerEl, expedition, onWaypointTap) {
  if (!root) {
    currentMapDiv = document.createElement('div');
    currentMapDiv.style.width = '100%';
    currentMapDiv.style.height = '100%';
    currentMapDiv.style.position = 'absolute';
    currentMapDiv.style.inset = '0';
    root = createRoot(currentMapDiv);
  }

  if (currentMapDiv.parentNode !== containerEl) {
    containerEl.appendChild(currentMapDiv);
  }

  root.render(<ExpeditionMap expedition={expedition} onWaypointTap={onWaypointTap} />);
}
