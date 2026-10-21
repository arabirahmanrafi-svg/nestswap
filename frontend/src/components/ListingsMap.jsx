import { useEffect, useMemo } from 'react';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { beds, money } from '../format';

const US_CENTER = [39.5, -98.35];

/** A price "pill" marker (avoids Leaflet's default image icons, which break in bundlers). */
function priceIcon(price, active) {
  return L.divIcon({
    className: '',
    html: `<span class="map-pill ${active ? 'active' : ''}">${money(price)}</span>`,
    iconSize: null,
    iconAnchor: [28, 14],
  });
}

function FitBounds({ points, center }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      const all = center ? [...points, center] : points;
      map.fitBounds(L.latLngBounds(all), { padding: [40, 40], maxZoom: 15 });
    } else if (center) {
      map.setView(center, 12);
    }
  }, [map, points, center]);
  return null;
}

export default function ListingsMap({ listings, highlightedId, near }) {
  const located = listings.filter((l) => l.latitude != null && l.longitude != null);
  // Only re-fit the map when the set of results or the search center actually changes,
  // so hovering or re-rendering doesn't yank the map away from where the user panned.
  const idsKey = located.map((l) => l.id).join(',');
  const points = useMemo(() => located.map((l) => [l.latitude, l.longitude]), [idsKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const center = useMemo(() => (near ? [near.lat, near.lng] : null), [near?.lat, near?.lng]);
  const missing = listings.length - located.length;

  return (
    <div className="map-wrap">
      <MapContainer center={center || US_CENTER} zoom={center ? 12 : 4} className="results-map" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} center={center} />
        {near && (
          <Circle center={center} radius={near.radiusMiles * 1609.34}
            pathOptions={{ color: '#1f5d4c', weight: 1, fillOpacity: 0.06 }} />
        )}
        {located.map((l) => (
          <Marker
            key={l.id}
            position={[l.latitude, l.longitude]}
            icon={priceIcon(l.monthlyRent, l.id === highlightedId)}
            zIndexOffset={l.id === highlightedId ? 1000 : 0}
            keyboard
            title={`${l.title}, ${money(l.monthlyRent)} per month`}
          >
            <Popup>
              <Link to={`/listings/${l.id}`} className="map-popup">
                {l.cover && <img src={l.cover.url} alt="" />}
                <strong>{money(l.monthlyRent)}/mo</strong>
                <span>{l.title}</span>
                <span className="muted">{beds(l.bedrooms)}, {l.city}</span>
              </Link>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {missing > 0 && (
        <p className="map-note">{missing} listing{missing === 1 ? '' : 's'} on this page {missing === 1 ? 'has' : 'have'} no map pin.</p>
      )}
    </div>
  );
}
