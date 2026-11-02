// Vercel serverless function — generates a dynamic sitemap that includes live property pages.
// Served at /sitemap.xml via the rewrite in vercel.json.

const SITE_URL = (process.env.SITE_URL || 'https://buildestate.vercel.app').replace(/\/$/, '');
const BACKEND_URL = process.env.VITE_API_BASE_URL || 'https://buildestate-api-prod.azurewebsites.net';

const STATIC_PAGES = [
  { url: '/',           changefreq: 'weekly',  priority: '1.0' },
  { url: '/properties', changefreq: 'daily',   priority: '0.9' },
  { url: '/ai-hub',     changefreq: 'weekly',  priority: '0.8' },
  { url: '/about',      changefreq: 'monthly', priority: '0.7' },
  { url: '/contact',    changefreq: 'monthly', priority: '0.7' },
];

export const escapeXml = value => String(value).replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]);
function toXmlUrl({ loc, lastmod, changefreq, priority }) {
  return [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod   ? `    <lastmod>${escapeXml(lastmod)}</lastmod>` : '',
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : '',
    priority   ? `    <priority>${priority}</priority>` : '',
    '  </url>',
  ].filter(Boolean).join('\n');
}

export default async function handler(req, res) {
  const today = new Date().toISOString().split('T')[0];

  // Fetch live property listings from the backend
  let propertyUrls = [];
  try {
    const deadline = AbortSignal.timeout(15000);
    for (let page = 1; ; page++) {
      const response = await fetch(`${BACKEND_URL}/api/products/list?page=${page}&limit=100`, { signal: deadline });
      if (!response.ok) throw new Error('Catalog unavailable');
      const data = await response.json();
      if (!Array.isArray(data.property) || !data.pagination || typeof data.pagination.hasNextPage !== 'boolean') throw new Error('Invalid catalog response');
      propertyUrls.push(...data.property.filter(p => /^[a-f0-9]{24}$/i.test(p._id)).map(p => ({
        loc: `${SITE_URL}/property/${p._id}`,
        lastmod: p.updatedAt ? new Date(p.updatedAt).toISOString().split('T')[0] : today,
        changefreq: 'weekly', priority: '0.8',
      })));
      if (!data.pagination.hasNextPage) break;
      if (propertyUrls.length >= 49000) throw new Error('Sitemap index required');
    }
  } catch {
    // Do not cache an incomplete sitemap as a successful catalog snapshot.
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).send('Sitemap temporarily unavailable');
  }

  const staticEntries = STATIC_PAGES.map((p) =>
    toXmlUrl({ loc: `${SITE_URL}${p.url}`, lastmod: today, ...p })
  );

  const propertyEntries = propertyUrls.map(toXmlUrl);

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...staticEntries,
    ...propertyEntries,
    '</urlset>',
  ].join('\n');

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  res.status(200).send(xml);
}
