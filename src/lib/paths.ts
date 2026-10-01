/**
 * Base-path helpers. The site can be served from the domain root (local
 * preview, Vercel, owt.com.ua) or from a sub-path such as GitHub Pages’
 * /owt-website/. Every internal absolute URL goes through withBase().
 */
const BASE = import.meta.env.BASE_URL.replace(/\/+$/, ''); // '' or '/owt-website'

/** '/posluhy/' → '/owt-website/posluhy/' (anchors, external and relative URLs untouched). */
export const withBase = (p: string) => (p.startsWith('/') && !p.startsWith('//') ? `${BASE}${p}` : p);

/** '/owt-website/posluhy/' → '/posluhy/' — for comparing the current path with route paths. */
export const stripBase = (p: string) => (BASE && p.startsWith(BASE) ? p.slice(BASE.length) || '/' : p);
