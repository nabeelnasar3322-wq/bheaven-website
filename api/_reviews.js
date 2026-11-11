// Needs env GOOGLE_PLACES_KEY (Places API New). Optional GOOGLE_PLACE_ID to skip the lookup.
// With no key, or if Google fails, returns 204 and the page keeps its saved numbers.
const CID = '8101510049190568046';
const QUERY = 'B-Heaven by Barceló Dubai Al Jaddaf';
let cachedId = null;

async function g(url, opts) {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error('google ' + r.status);
  return r.json();
}

async function resolvePlaceId(key) {
  if (process.env.GOOGLE_PLACE_ID) return process.env.GOOGLE_PLACE_ID;
  if (cachedId) return cachedId;
  const data = await g('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.id,places.googleMapsUri'
    },
    body: JSON.stringify({ textQuery: QUERY })
  });
  const list = data.places || [];
  const hit = list.find(p => (p.googleMapsUri || '').includes(CID)) || list[0];
  if (!hit) throw new Error('place not found');
  return (cachedId = hit.id);
}

module.exports = async (req, res) => {
  const key = process.env.GOOGLE_PLACES_KEY;
  if (!key) { res.statusCode = 204; return res.end(); }
  try {
    const id = await resolvePlaceId(key);
    const d = await g('https://places.googleapis.com/v1/places/' + encodeURIComponent(id), {
      headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'rating,userRatingCount' }
    });
    const rating = Number(d.rating), count = Number(d.userRatingCount);
    if (!(rating >= 1 && rating <= 5) || !(count > 0)) { res.statusCode = 204; return res.end(); }
    // Cache a day at the CDN so Google is called ~once per day (stays in the free tier).
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({ rating: rating.toFixed(1), count: String(count) }));
  } catch (e) {
    res.statusCode = 204; // fall back to the saved rating
    res.end();
  }
};
