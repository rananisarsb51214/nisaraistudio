function clean(value, fallback = '') { return typeof value === 'string' ? value.slice(0, 300) : fallback; }
function withAffiliate(url, provider) {
  if (!url) return url;
  const key = `${provider.toUpperCase()}_AFFILIATE_URL`;
  const base = process.env[key];
  if (!base) return url;
  try {
    const target = new URL(url);
    const partner = new URL(base);
    partner.searchParams.set('url', target.toString());
    return partner.toString();
  } catch { return url; }
}

async function unsplash(q) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return [];
  const r = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=6`, { headers: { Authorization: `Client-ID ${key}` } });
  if (!r.ok) return [];
  const d = await r.json();
  return (d.results || []).map(x => ({ provider: 'Unsplash', title: x.alt_description || 'Unsplash image', url: withAffiliate(x.links?.html, 'unsplash'), image: x.urls?.small }));
}
async function pexels(q) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return [];
  const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=6`, { headers: { Authorization: key } });
  if (!r.ok) return [];
  const d = await r.json();
  return (d.photos || []).map(x => ({ provider: 'Pexels', title: x.alt || 'Pexels image', url: withAffiliate(x.url, 'pexels'), image: x.src?.medium }));
}
async function shutterstock(q) {
  const token = process.env.SHUTTERSTOCK_ACCESS_TOKEN;
  if (!token) return [];
  const r = await fetch(`https://api.shutterstock.com/v2/images/search?query=${encodeURIComponent(q)}&per_page=6`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) return [];
  const d = await r.json();
  return (d.data || []).map(x => ({ provider: 'Shutterstock', title: x.description || 'Shutterstock image', url: withAffiliate(`https://www.shutterstock.com/image-photo/${x.id}`, 'shutterstock'), image: x.assets?.preview?.url }));
}
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const q = clean(req.query?.q);
  if (!q) return res.status(400).json({ error: 'Query is required.' });
  try {
    const groups = await Promise.all([unsplash(q), pexels(q), shutterstock(q)]);
    const results = groups.flat();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({ results, configured: { unsplash: !!process.env.UNSPLASH_ACCESS_KEY, pexels: !!process.env.PEXELS_API_KEY, shutterstock: !!process.env.SHUTTERSTOCK_ACCESS_TOKEN } });
  } catch { return res.status(502).json({ error: 'Stock provider request failed.' }); }
}
