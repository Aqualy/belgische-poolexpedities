import { getMap } from './antarcticMap.js';

// Keep track of layers so we can clear them easily without recreating the whole map
let routeLayer = null;
let waypointsLayer = null;
let activePopupMarker = null;

export function drawExpeditionRoute(expedition, mapMode = 'naar', onWaypointTap) {
  const map = getMap();
  if (!map) return;

  // Clear existing paths and icons
  if (routeLayer) map.removeLayer(routeLayer);
  if (waypointsLayer) map.removeLayer(waypointsLayer);
  hideWaypointCard();

  const routeWaypoints = expedition.route;
  if (!routeWaypoints || routeWaypoints.length === 0) return;

  // Build normal route path using Leaflet polyline Lat/Lng mapping
  const latlngs = routeWaypoints.map(wp => [wp.lat, wp.lon]);

  // Animated line representation
  routeLayer = L.polyline(latlngs, {
    color: '#7EB8D4',
    weight: 2,
    opacity: 0.8,
    lineCap: 'round',
    lineJoin: 'round',
    dashArray: '10, 10', // Give it a dashed style for expedition routes
    dashOffset: '0'
  }).addTo(map);

  // Group for waypoints
  waypointsLayer = L.layerGroup().addTo(map);

  // Draw waypoints
  for (const wp of routeWaypoints) {
    drawWaypoint(map, wp, onWaypointTap);
  }

  // Draw Drift Path if it exists
  if (expedition.driftPath && expedition.driftPath.length > 0) {
    const driftLatLngs = expedition.driftPath.map(dp => [dp.lat, dp.lon]);
    const driftPathLayer = L.polyline(driftLatLngs, {
      color: '#4A90B8',
      weight: 1.5,
      opacity: 0.6,
      dashArray: '3, 6',
      lineCap: 'round'
    });
    driftPathLayer.addTo(routeLayer);
  }

  // Fit bounds natively using Leaflet. This ensures the full route is seen automatically!
  map.fitBounds(routeLayer.getBounds(), {
    padding: [50, 50],
    animate: true,
    duration: 1.5 // Smooth fly transition
  });
}

function drawWaypoint(map, wp, onTap) {
  // Use a custom icon element rather than Leaflet standard blue pin
  const customIcon = L.divIcon({
    className: 'custom-waypoint',
    html: `
      <div style="background-color: #F4F9FC; border: 1px solid #7EB8D4; border-radius: 50%; width: 8px; height: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>
    `,
    iconSize: [8, 8],
    iconAnchor: [4, 4]
  });

  const marker = L.marker([wp.lat, wp.lon], { icon: customIcon }).addTo(waypointsLayer);

  marker.on('click', () => {
    // When marker clicked, we can show logic
    if (onTap) onTap(wp);
    
    // Popup standard handling
    marker.bindPopup(`
      <div style="color: #111; font-family: Courier New, monospace; padding: 4px;">
        <strong style="color: #070F1C">${wp.label}</strong><br/>
        <small style="color: #666;">${wp.date}</small>
        ${wp.fact ? `<p style="margin-top: 6px; font-family: 'Cormorant Garamond', serif; font-size: 14px;">${wp.fact}</p>` : ''}
      </div>
    `).openPopup();
    
    activePopupMarker = marker;
  });
}

export function hideWaypointCard() {
  if (activePopupMarker) {
    activePopupMarker.closePopup();
    activePopupMarker = null;
  }
}

export function clearRoute() {
  const map = getMap();
  if (!map) return;
  if (routeLayer) map.removeLayer(routeLayer);
  if (waypointsLayer) map.removeLayer(waypointsLayer);
  routeLayer = null;
  waypointsLayer = null;
}
