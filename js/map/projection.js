// Polar stereographic projection centered on the South Pole
// Suitable for displaying Antarctic routes in SVG space

const R = 380; // base radius in SVG units (South Pole at origin)

// Convert geographic lon/lat (degrees) to SVG coordinates
// Centered on (cx, cy) in the SVG viewport
export function project(lon, lat, cx = 0, cy = 0) {
  const lonRad = (lon * Math.PI) / 180;
  const latRad = (lat * Math.PI) / 180;

  // For southern hemisphere: r grows as lat moves toward equator
  // South Pole (lat=-90) → r=0, Equator (lat=0) → r=R*tan(45°)=R
  // We use only negative latitudes (Antarctica range)
  const r = R * Math.tan(Math.PI / 4 - latRad / 2);

  const x = r * Math.sin(lonRad) + cx;
  const y = -r * Math.cos(lonRad) + cy; // negate for screen coords (y down)

  return { x, y };
}

// Convert SVG coordinates back to lon/lat (approximate inverse)
export function unproject(svgX, svgY, cx = 0, cy = 0) {
  const x = svgX - cx;
  const y = -(svgY - cy);
  const r = Math.sqrt(x * x + y * y);
  const lon = Math.atan2(x, y) * 180 / Math.PI;
  const lat = (Math.PI / 2 - 2 * Math.atan(r / R)) * 180 / Math.PI;
  return { lon, lat };
}

// Distance from South Pole in SVG units at a given latitude
export function latToRadius(lat) {
  const latRad = (lat * Math.PI) / 180;
  return R * Math.tan(Math.PI / 4 - latRad / 2);
}

// Latitude rings to draw on the basemap
export const LATITUDE_RINGS = [-90, -80, -70, -60, -50, -40, -30, -20, -10, 0];
export const DISPLAY_RINGS = [-80, -70, -60];

// Ocean label positions for editorial annotation
export const OCEAN_LABELS = [
  { text: 'Zuidelijke IJszee', lon: 0,   lat: -60 },
  { text: 'Weddellzee',        lon: -45, lat: -73 },
  { text: 'Rossszee',          lon: 178, lat: -75 },
  { text: 'Belingshausenzee',  lon: -95, lat: -70 },
];
