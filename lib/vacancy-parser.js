const MAX_DESCRIPTION = 12000;

function decodeEntities(value = '') {
  return String(value)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

export function htmlToText(value = '') {
  return decodeEntities(String(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n')
    .replace(/<\/li\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[\t\r ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function attr(tag, name) {
  const match = String(tag).match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return decodeEntities(match?.[1] ?? match?.[2] ?? match?.[3] ?? '');
}

function metaValue(html, names = []) {
  for (const tag of String(html).match(/<meta\b[^>]*>/gi) || []) {
    const key = (attr(tag, 'property') || attr(tag, 'name')).toLowerCase();
    if (names.includes(key)) return attr(tag, 'content').trim();
  }
  return '';
}

function pageTitle(html) {
  const match = String(html).match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return match ? htmlToText(match[1]) : '';
}

function findJobPosting(value, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return null;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findJobPosting(item, seen);
      if (found) return found;
    }
    return null;
  }
  const type = value['@type'];
  const types = Array.isArray(type) ? type : [type];
  if (types.some(x => String(x).toLowerCase() === 'jobposting')) return value;
  for (const child of Object.values(value)) {
    const found = findJobPosting(child, seen);
    if (found) return found;
  }
  return null;
}

function structuredJob(html) {
  const scripts = String(html).match(/<script\b[^>]*type\s*=\s*(?:"application\/ld\+json"|'application\/ld\+json')[^>]*>[\s\S]*?<\/script>/gi) || [];
  for (const script of scripts) {
    const body = script.replace(/^<script\b[^>]*>/i, '').replace(/<\/script>\s*$/i, '').trim();
    if (!body || body.length > 700000) continue;
    try {
      const found = findJobPosting(JSON.parse(body));
      if (found) return found;
    } catch {
      // Invalid JSON-LD should not make the whole page fail.
    }
  }
  return null;
}

function organizationName(job) {
  const org = job?.hiringOrganization;
  if (typeof org === 'string') return org.trim();
  return String(org?.name || '').trim();
}

function addressText(location) {
  const locations = Array.isArray(location) ? location : [location];
  const result = [];
  for (const item of locations) {
    if (!item) continue;
    if (typeof item === 'string') { result.push(item); continue; }
    const a = item.address || item;
    const pieces = [a.addressLocality, a.addressRegion, a.addressCountry?.name || a.addressCountry].filter(Boolean).map(String);
    if (pieces.length) result.push(pieces.join(', '));
    else if (item.name) result.push(String(item.name));
  }
  return [...new Set(result.map(x => x.trim()).filter(Boolean))].join(' · ');
}

function salaryText(baseSalary) {
  if (!baseSalary) return '';
  if (typeof baseSalary === 'string' || typeof baseSalary === 'number') return String(baseSalary);
  const currency = baseSalary.currency || baseSalary.value?.currency || '';
  const value = baseSalary.value ?? baseSalary;
  if (typeof value === 'number' || typeof value === 'string') return `${value}${currency ? ` ${currency}` : ''}`.trim();
  if (!value || typeof value !== 'object') return '';
  const min = value.minValue ?? value.value ?? '';
  const max = value.maxValue ?? '';
  const unit = value.unitText || baseSalary.unitText || '';
  const range = min !== '' && max !== '' ? `${min}–${max}` : String(min || max || '');
  return [range, currency, unit].filter(Boolean).join(' / ').replace(' / / ', ' / ').trim();
}

function inferWorkMode(job, description = '') {
  const structured = [job?.jobLocationType, job?.employmentType].flat().filter(Boolean).join(' ').toLowerCase();
  const text = `${structured} ${description}`.toLowerCase();
  if (/telecommute|remote|удал[её]н|дистанц/.test(text)) return 'remote';
  if (/hybrid|гибрид/.test(text)) return 'hybrid';
  if (/on[ -]?site|office|офис/.test(text)) return 'office';
  return '';
}

function sourceFromUrl(url) {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    const known = [
      [/^(hh\.ru|headhunter\.)/, 'HH'],
      [/linkedin\.com$/, 'LinkedIn'],
      [/geekjob\.ru$/, 'Geekjob'],
      [/indeed\./, 'Indeed'],
      [/glassdoor\./, 'Glassdoor'],
      [/superjob\.ru$/, 'SuperJob'],
      [/career\.habr\.com$/, 'Хабр Карьера']
    ];
    for (const [pattern, label] of known) if (pattern.test(host)) return label;
    return host;
  } catch { return ''; }
}

function cleanRoleTitle(value = '') {
  return String(value).replace(/\s+[|·—-]\s+(LinkedIn|HH\.ru|HeadHunter|Indeed|Glassdoor).*$/i, '').trim().slice(0, 200);
}

export function extractVacancyFromHtml(html, finalUrl) {
  const job = structuredJob(html);
  const confidence = {};
  const roleStructured = String(job?.title || '').trim();
  const roleMeta = metaValue(html, ['og:title', 'twitter:title']) || pageTitle(html);
  const descriptionStructured = htmlToText(job?.description || '');
  const descriptionMeta = htmlToText(metaValue(html, ['og:description', 'description', 'twitter:description']));
  const data = {
    company: organizationName(job).slice(0, 160),
    role: cleanRoleTitle(roleStructured || roleMeta),
    source: sourceFromUrl(finalUrl).slice(0, 120),
    url: finalUrl,
    location: addressText(job?.jobLocation).slice(0, 180),
    workMode: inferWorkMode(job, descriptionStructured || descriptionMeta),
    salary: salaryText(job?.baseSalary).slice(0, 180),
    description: (descriptionStructured || descriptionMeta).slice(0, MAX_DESCRIPTION)
  };
  if (data.company) confidence.company = 'structured';
  if (data.role) confidence.role = roleStructured ? 'structured' : 'meta';
  if (data.location) confidence.location = 'structured';
  if (data.workMode) confidence.workMode = job?.jobLocationType ? 'structured' : 'inferred';
  if (data.salary) confidence.salary = 'structured';
  if (data.description) confidence.description = descriptionStructured ? 'structured' : 'meta';
  confidence.source = 'url';
  confidence.url = 'url';
  const detected = Object.entries(data).filter(([key, value]) => key !== 'url' && Boolean(value)).map(([key]) => key);
  const needsReview = ['company', 'role', 'description'].filter(key => !data[key]);
  return {data, confidence, detected, needsReview, structured:Boolean(job)};
}
