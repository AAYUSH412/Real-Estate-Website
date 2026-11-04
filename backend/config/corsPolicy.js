// Keep production and isolated HTTP acceptance checks on the same origin policy.
const csv = value => (value || '').split(',').map(origin => origin.trim()).filter(Boolean);
export function allowedOrigins(env = process.env) {
  return [...new Set([
    ...(env.NODE_ENV === 'production' ? [] : ['http://localhost:4000', 'http://localhost:5173', 'http://localhost:5174']),
    env.FRONTEND_URL, env.ADMIN_URL, env.WEBSITE_URL,
    ...csv(env.LOCAL_URLS), ...csv(env.EXTRA_ALLOWED_ORIGINS),
  ].filter(Boolean))];
}
export function corsOptions(env = process.env) {
  const origins = allowedOrigins(env);
  return {
    origin: (origin, callback) => {
      if (!origin || origins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    exposedHeaders: ['X-Export-Limit', 'X-Export-Total', 'X-Export-Truncated'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Firecrawl-Key'],
  };
}
