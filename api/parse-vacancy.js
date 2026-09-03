import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
import {extractVacancyFromHtml} from '../lib/vacancy-parser.js';

const MAX_HTML_BYTES = 2_000_000;
const MAX_REDIRECTS = 4;
const USER_AGENT = 'Mozilla/5.0 (compatible; AnostosioJobSearchCRM/1.0; +https://anostosio.ru/)';

function isPrivateIp(address) {
  const version = isIP(address);
  if (version === 4) {
    const parts = address.split('.').map(Number);
    const [a,b] = parts;
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
  }
  if (version === 6) {
    const v = address.toLowerCase();
    if (v === '::' || v === '::1' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe8') || v.startsWith('fe9') || v.startsWith('fea') || v.startsWith('feb') || v.startsWith('ff')) return true;
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? isPrivateIp(mapped[1]) : false;
  }
  return true;
}

async function assertPublicUrl(raw) {
  let url;
  try { url = new URL(String(raw || '').trim()); } catch { throw Object.assign(new Error('Invalid vacancy URL.'), {status:400}); }
  if (!['http:','https:'].includes(url.protocol) || url.username || url.password) throw Object.assign(new Error('Only public HTTP(S) vacancy links are supported.'), {status:400});
  const host = url.hostname.toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) throw Object.assign(new Error('This address is not allowed.'), {status:403});
  if (isIP(host)) {
    if (isPrivateIp(host)) throw Object.assign(new Error('This address is not allowed.'), {status:403});
  } else {
    let addresses;
    try { addresses = await lookup(host, {all:true, verbatim:true}); } catch { throw Object.assign(new Error('Could not resolve this vacancy site.'), {status:422}); }
    if (!addresses.length || addresses.some(x => isPrivateIp(x.address))) throw Object.assign(new Error('This address is not allowed.'), {status:403});
  }
  return url;
}

async function fetchHtml(rawUrl) {
  let url = await assertPublicUrl(rawUrl);
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
    let response;
    try {
      response = await fetch(url, {
        redirect:'manual',
        signal:AbortSignal.timeout(9000),
        headers:{'user-agent':USER_AGENT,'accept':'text/html,application/xhtml+xml;q=0.9,*/*;q=0.2','accept-language':'en,ru;q=0.8'}
      });
    } catch {
      throw Object.assign(new Error('The vacancy page could not be reached.'), {status:502});
    }
    if ([301,302,303,307,308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location || redirect === MAX_REDIRECTS) throw Object.assign(new Error('Too many redirects while opening this vacancy.'), {status:422});
      url = await assertPublicUrl(new URL(location, url).href);
      continue;
    }
    if (!response.ok) throw Object.assign(new Error(`The vacancy site returned ${response.status}. You can still enter the details manually.`), {status:422});
    const type = (response.headers.get('content-type') || '').toLowerCase();
    if (type && !type.includes('text/html') && !type.includes('application/xhtml+xml')) throw Object.assign(new Error('This link does not point to an HTML vacancy page.'), {status:422});
    const length = Number(response.headers.get('content-length'));
    if (Number.isFinite(length) && length > MAX_HTML_BYTES) throw Object.assign(new Error('This vacancy page is too large to import safely.'), {status:413});
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_HTML_BYTES) throw Object.assign(new Error('This vacancy page is too large to import safely.'), {status:413});
    return {html:new TextDecoder('utf-8').decode(bytes), finalUrl:url.href};
  }
  throw Object.assign(new Error('Could not open this vacancy page.'), {status:422});
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ok:false,error:'Method not allowed.'});
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const rawUrl = String(body.url || '').trim();
    if (!rawUrl || rawUrl.length > 2048) return res.status(400).json({ok:false,error:'Enter a valid vacancy URL.'});
    const {html, finalUrl} = await fetchHtml(rawUrl);
    const result = extractVacancyFromHtml(html, finalUrl);
    return res.status(200).json({ok:true,...result});
  } catch (error) {
    const status = Number(error?.status) || 500;
    const message = status >= 500 && !error?.message ? 'Could not read this vacancy page.' : (error?.message || 'Could not read this vacancy page.');
    return res.status(status).json({ok:false,error:message});
  }
}
