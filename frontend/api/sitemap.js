// Vercel serverless function — generates a dynamic sitemap that includes live property pages.
// Served at /sitemap.xml via the rewrite in vercel.json.

const SITE_URL = 'https://buildestate.vercel.app';
const BACKEND_URL = process.env.VITE_API_BASE_URL || 'https://buildestate-backend.onrender.com';

const STATIC_PAGES = [
  { url: '/',           changefreq: 'weekly',  priority: '1.0' },
  { url: '/properties', changefreq: 'daily',   priority: '0.9' },
  { url: '/ai-hub',     changefreq: 'weekly',  priority: '0.8' },
  { url: '/about',      changefreq: 'monthly', priority: '0.7' },
  { url: '/contact',    changefreq: 'monthly', priority: '0.7' },
];

function toXmlUrl({ loc, lastmod, changefreq, priority }) {
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    lastmod   ? `    <lastmod>${lastmod}</lastmod>` : '',
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
    const response = await fetch(`${BACKEND_URL}/api/products/list`, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      const data = await response.json();
      const properties = data.properties || data.Products || [];
      propertyUrls = properties
        .filter((p) => p._id && p.status !== 'rejected')
        .map((p) => ({
          loc: `${SITE_URL}/property/${p._id}`,
          lastmod: p.updatedAt ? p.updatedAt.split('T')[0] : today,
          changefreq: 'weekly',
          priority: '0.8',
        }));
    }
  } catch {
    // Backend unreachable — serve static-only sitemap (better than 500)
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
