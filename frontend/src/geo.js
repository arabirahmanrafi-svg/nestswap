// Address → coordinates using OpenStreetMap's free Nominatim service.
// Fine for a student project; for heavy traffic, switch to a paid geocoder.
// Usage policy: https://operations.osmfoundation.org/policies/nominatim/

export async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('Location lookup failed. Try again in a moment.');
  const data = await res.json();
  if (!data.length) return null;
  return { lat: Number(data[0].lat), lng: Number(data[0].lon), label: data[0].display_name };
}

export function currentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Your browser can’t share location.'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => reject(new Error('Location permission was denied.')),
      { timeout: 10000 },
    );
  });
}
