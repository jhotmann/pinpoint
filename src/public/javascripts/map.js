// Load map stylesheet
const css = document.createElement('link');
css.setAttribute('rel', 'stylesheet');
css.setAttribute('href', '/stylesheets/leaflet.css');
document.head.appendChild(css);

let markers = [];

const map = L.map('map');

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
}).addTo(map);

const events = new EventSource(`${window.location.pathname}/sse`);

events.onopen = () => {
  console.log(`Connection opened to ${events.url}`)
}

events.onmessage = (event) => {
  console.log(event.data);
  const data = JSON.parse(event.data);
  if (!Array.isArray(data)) return;
  markers.forEach((marker) => { marker.remove(); });
  markers = data.map((d) => {
    const icon = L.icon({
      iconUrl: d.icon,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      className: 'rounded-circle'
    });
    const marker = L.marker([d.lat, d.lon], { icon });
    marker.bindPopup(`${d.name}<br/>${(new Date(d.date)).toLocaleString()}`).openPopup();
    return marker;
  });
  markers.forEach((marker) => { marker.addTo(map); });
  if (markers.length > 0) map.fitBounds(markers.map((m) => m.getLatLng()), { padding: [10, 10] });
}

events.addEventListener('ping', () => {
  console.log('Ping received');
});