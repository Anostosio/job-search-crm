import { localDateKey, safeIsoTimestamp } from './date.js';

export const ACTIVE_STATUSES = ['candidate', 'preparing', 'applied', 'test', 'interview', 'offer'];
export const ARCHIVE_STATUSES = ['rejected', 'closed'];
export const ALL_STATUSES = [...ACTIVE_STATUSES, ...ARCHIVE_STATUSES];
export const PRIORITIES = ['veryHigh', 'high', 'medium', 'low'];
export const WORK_MODES = ['remote', 'hybrid', 'office', 'flexible', 'unknown'];
export const DIRECTIONS = ['design', 'aiBuilder', 'brand', 'visual', 'digital', 'other'];

const EVENT_FOR_STATUS = {
  applied: 'applied',
  test: 'test',
  interview: 'interview',
  rejected: 'rejected',
  offer: 'offer'
};

export function uid() {
  return globalThis.crypto?.randomUUID?.() || `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function clampScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

export function sanitizeUrl(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.toString();
  } catch {
    return '';
  }
}

export function normalizeUrl(value = '') {
  const safe = sanitizeUrl(value);
  if (!safe) return '';
  try {
    const url = new URL(safe);
    url.hash = '';
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'].forEach(key => url.searchParams.delete(key));
    url.hostname = url.hostname.toLowerCase();
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    const normalized = url.toString().replace(/\/$/, '');
    return normalized.toLowerCase();
  } catch {
    return '';
  }
}

export function normalizeText(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[\s\u00a0]+/g, ' ')
    .replace(/[“”„«»'"`]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function findDuplicate(jobs, candidate, ignoreId = null) {
  const normalizedCandidateUrl = normalizeUrl(candidate.url);
  const company = normalizeText(candidate.company);
  const role = normalizeText(candidate.role);
  return jobs.find(job => {
    if (job.id === ignoreId) return false;
    const sameUrl = normalizedCandidateUrl && normalizeUrl(job.url) === normalizedCandidateUrl;
    const sameIdentity = company && role && normalizeText(job.company) === company && normalizeText(job.role) === role;
    return sameUrl || sameIdentity;
  }) || null;
}

export function historyEvent(type, details = {}, at = new Date().toISOString()) {
  return { id: uid(), type, at: safeIsoTimestamp(at), ...details };
}

function safeId(value) {
  const candidate = String(value || '');
  return /^[A-Za-z0-9._:-]{1,120}$/.test(candidate) ? candidate : uid();
}

export function normalizeJob(input = {}, now = new Date()) {
  const createdAt = safeIsoTimestamp(input.createdAt || now);
  const status = ALL_STATUSES.includes(input.status) ? input.status : 'candidate';
  const priority = PRIORITIES.includes(input.priority) ? input.priority : 'medium';
  const direction = DIRECTIONS.includes(input.direction) ? input.direction : 'other';
  const workMode = WORK_MODES.includes(input.workMode) ? input.workMode : 'unknown';
  const history = Array.isArray(input.history) ? input.history
    .filter(item => item && typeof item === 'object' && typeof item.type === 'string')
    .slice(-200)
    .map(item => ({ ...item, id: item.id || uid(), at: safeIsoTimestamp(item.at || createdAt) })) : [];
  if (!history.length) history.push(historyEvent('created', {}, createdAt));

  return {
    id: safeId(input.id),
    company: String(input.company || '').trim().slice(0, 160),
    role: String(input.role || '').trim().slice(0, 200),
    direction,
    status,
    priority,
    matchScore: clampScore(input.matchScore ?? input.match ?? 0),
    source: String(input.source || '').trim().slice(0, 120),
    url: sanitizeUrl(input.url || ''),
    location: String(input.location || '').trim().slice(0, 180),
    workMode,
    salary: String(input.salary || '').trim().slice(0, 180),
    description: String(input.description || '').trim().slice(0, 12000),
    notes: String(input.notes || '').trim().slice(0, 8000),
    createdAt,
    updatedAt: safeIsoTimestamp(input.updatedAt || createdAt),
    appliedAt: /^\d{4}-\d{2}-\d{2}$/.test(String(input.appliedAt || '')) ? input.appliedAt : '',
    followUpAt: /^\d{4}-\d{2}-\d{2}$/.test(String(input.followUpAt || input.followup || '')) ? (input.followUpAt || input.followup) : '',
    nextAction: String(input.nextAction || '').trim().slice(0, 300),
    contactName: String(input.contactName || '').trim().slice(0, 160),
    contactChannel: String(input.contactChannel || '').trim().slice(0, 160),
    strengths: Array.isArray(input.strengths) ? input.strengths.map(String).map(s => s.slice(0, 300)).slice(0, 20) : [],
    gaps: Array.isArray(input.gaps) ? input.gaps.map(String).map(s => s.slice(0, 300)).slice(0, 20) : [],
    rejectionReason: String(input.rejectionReason || '').trim().slice(0, 1000),
    profileId: String(input.profileId || '').trim(),
    demo: Boolean(input.demo),
    history
  };
}

export function patchJob(job, patch, now = new Date()) {
  const before = normalizeJob(job, now);
  const merged = normalizeJob({ ...before, ...patch, id: before.id, createdAt: before.createdAt, history: [...before.history] }, now);
  const events = [...before.history];
  if (patch.status && patch.status !== before.status) {
    events.push(historyEvent('status_changed', { from: before.status, to: merged.status }));
    const eventType = EVENT_FOR_STATUS[merged.status];
    if (eventType) events.push(historyEvent(eventType));
    if (merged.status === 'applied' && !merged.appliedAt) merged.appliedAt = localDateKey(now);
  }
  if (patch.followUpAt !== undefined && merged.followUpAt !== before.followUpAt && merged.followUpAt) {
    events.push(historyEvent('followup_scheduled', { date: merged.followUpAt }));
  }
  if (patch.notes !== undefined && merged.notes !== before.notes && merged.notes.trim()) {
    events.push(historyEvent('note_added'));
  }
  merged.history = events.slice(-200);
  merged.updatedAt = now.toISOString();
  return merged;
}

export function createJob(input, now = new Date()) {
  const created = normalizeJob({ ...input, id: input.id || uid(), createdAt: now.toISOString(), updatedAt: now.toISOString(), history: [] }, now);
  if (created.status === 'applied' && !created.appliedAt) created.appliedAt = localDateKey(now);
  return created;
}

export function createDemoJobs(now = new Date()) {
  const today = localDateKey(now);
  const plus = days => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.setDate(d.getDate() + days);
    return localDateKey(d);
  };
  return [
    createJob({ company: 'Northstar Studio', role: 'Brand Designer', direction: 'design', status: 'preparing', priority: 'veryHigh', matchScore: 88, source: 'LinkedIn', workMode: 'remote', location: 'Europe', salary: '€1,700–2,200', followUpAt: plus(2), strengths: ['Strong brand-system focus', 'Portfolio-first process'], gaps: ['Motion is a plus'], notes: 'Demo vacancy — replace with a real opportunity.', demo: true }, now),
    createJob({ company: 'Flowstack', role: 'AI Product Builder', direction: 'aiBuilder', status: 'applied', priority: 'high', matchScore: 81, source: 'Career page', workMode: 'remote', location: 'Remote', salary: '$1,400–1,800', appliedAt: today, followUpAt: plus(0), strengths: ['Figma + prototyping', 'JavaScript and API basics'], gaps: ['React depth'], notes: 'Demo vacancy — follow up today.', demo: true }, now),
    createJob({ company: 'Orbit Works', role: 'Visual Designer', direction: 'visual', status: 'interview', priority: 'high', matchScore: 84, source: 'HH', workMode: 'hybrid', location: 'Remote / EU', salary: '€1,500+', nextAction: 'Prepare three portfolio stories for the interview', followUpAt: plus(1), demo: true }, now)
  ];
}
