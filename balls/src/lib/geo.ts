/** Great-circle distance in miles. */
export function distanceMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Round a location to a ~500m grid. Discovery only needs an approximate
 * position, so precise coordinates are never stored or shown.
 */
export function approximate(p: { lat: number; lng: number }) {
  const step = 0.005;
  return { lat: Math.round(p.lat / step) * step, lng: Math.round(p.lng / step) * step };
}

/** Links for the user's preferred maps app. */
export function directionsUrl(app: 'google' | 'apple' | 'citymapper' | 'waze', p: { lat: number; lng: number }, name: string) {
  const ll = `${p.lat},${p.lng}`;
  switch (app) {
    case 'apple':
      return `https://maps.apple.com/?daddr=${ll}&q=${encodeURIComponent(name)}`;
    case 'citymapper':
      return `https://citymapper.com/directions?endcoord=${ll}&endname=${encodeURIComponent(name)}`;
    case 'waze':
      return `https://waze.com/ul?ll=${ll}&navigate=yes`;
    default:
      return `https://www.google.com/maps/dir/?api=1&destination=${ll}`;
  }
}

/** Open an external link in a new tab from a user gesture. */
export function openExternal(url: string) {
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
