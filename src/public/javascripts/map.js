// Load map stylesheet
const css = document.createElement('link');
css.setAttribute('rel', 'stylesheet');
css.setAttribute('href', '/stylesheets/leaflet.css');
document.head.appendChild(css);

let markers = [];

const map = L.map('map').setView([51.505, -0.09], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
}).addTo(map);

const events = new EventSource(`${window.location.href}/sse`);

events.onopen = () => {
  console.log(`Connection opened to ${events.url}`)
}

events.onmessage = (event) => {
  console.log(event.data);
  const data = JSON.parse(event.data);
  if (!Array.isArray(data)) return;
  const parsedData = data.map((d) => JSON.parse(d));
  markers.forEach((marker) => { marker.remove(); });
  markers = parsedData.filter((d) => d?.data?._type === 'location').map((d) => {
    const topicParts = d.data.topic.split('/');
    const marker = L.marker([d.data.lat, d.data.lon]);
    marker.bindPopup(`${topicParts[1]} - ${topicParts[2]}<br/>${(new Date(d.createdAt)).toLocaleString()}`);
    return marker;
  });
  markers.forEach((marker) => { marker.addTo(map); });
  if (markers.length > 0) map.fitBounds(markers.map((m) => m.getLatLng()));
}

events.addEventListener('ping', () => {
  console.log('Ping received');
});