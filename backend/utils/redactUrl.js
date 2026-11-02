export function redactUrl(value = '') {
  return String(value).split('?')[0]
    .replace(/(\/api\/users\/(?:verify|reset)\/)[^/]+/g, '$1[REDACTED]');
}
