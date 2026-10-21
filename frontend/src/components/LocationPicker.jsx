import { useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { geocode } from '../geo';

const pin = L.divIcon({ className: '', html: '<span class="map-dot" aria-hidden="true"></span>', iconSize: [22, 22], iconAnchor: [11, 11] });

function ClickToPlace({ onPick }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function Recenter({ point }) {
  const map = useMap();
  useEffect(() => { if (point) map.setView([point.lat, point.lng], Math.max(map.getZoom(), 15)); }, [map, point?.lat, point?.lng]); // eslint-disable-line
  return null;
}

/**
 * Puts the listing on the map. "Find on map" looks up the typed address;
 * the user can then click the map (or drag the pin) to fine-tune it.
 */
export default function LocationPicker({ address, value, onChange }) {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function find() {
    if (!address.trim()) { setStatus('Fill in the address, city and state first.'); return; }
    setBusy(true);
    setStatus('');
    try {
      const hit = await geocode(address);
      if (!hit) setStatus('Couldn’t find that address. Click the map to place the pin yourself.');
      else { onChange({ lat: hit.lat, lng: hit.lng }); setStatus('Found it! Click the map or drag the pin if it’s a little off.'); }
    } catch (e) {
      setStatus(e.message);
    } finally {
      setBusy(false);
    }
  }

  const round = (p) => ({ lat: Number(p.lat.toFixed(6)), lng: Number(p.lng.toFixed(6)) });

  return (
    <div className="location-picker">
      <div className="row-2">
        <button type="button" className="btn btn-ghost" onClick={find} disabled={busy}>{busy ? 'Looking up…' : 'Find on map'}</button>
        {value && <button type="button" className="link-btn" onClick={() => onChange(null)}>Remove pin</button>}
      </div>
      {status && <p className="hint" role="status">{status}</p>}
      <MapContainer center={value ? [value.lat, value.lng] : [39.5, -98.35]} zoom={value ? 15 : 4} className="picker-map">
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickToPlace onPick={(p) => onChange(round(p))} />
        <Recenter point={value} />
        {value && (
          <Marker position={[value.lat, value.lng]} icon={pin} draggable
            eventHandlers={{ dragend: (e) => onChange(round(e.target.getLatLng())) }} />
        )}
      </MapContainer>
      <p className="hint">A map pin lets people search by distance (for example, “within 2 miles of campus”). Listings without a pin won’t show up in distance searches.</p>
    </div>
  );
}
