let currentMap = null;

export function initMap(containerEl) {
  // Clear any existing map HTML
  containerEl.innerHTML = '';
  
  // Create a container specifically for leafet inside the passed element
  const mapDiv = document.createElement('div');
  mapDiv.style.width = '100%';
  mapDiv.style.height = '100%';
  mapDiv.style.position = 'absolute';
  mapDiv.style.inset = '0';
  mapDiv.style.background = '#070f1c'; // Match theme surface
  containerEl.appendChild(mapDiv);

  // Initialize Leaflet Map
  currentMap = L.map(mapDiv, {
    center: [-40, -10], // Roughly halfway between Europe and Antarctica
    zoom: 2,
    zoomControl: false, // We can hide default zoom controls or keep them
    worldCopyJump: true // Allow panning around the world continuously
  });

  // Dark thematic basemap tiles
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 10
  }).addTo(currentMap);

  return currentMap;
}

export function getMap() {
  return currentMap;
}
