import { SCHEMA_VERSION, migrateWorkspace } from './storage.js';
import { findDuplicate, normalizeJob } from './jobs.js';
import { ensureProfiles } from './profiles.js';

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_JOBS = 5000;
export const MAX_PROFILES = 50;

export function buildBackup(workspace, exportedAt = new Date().toISOString()) {
  const normalized = migrateWorkspace(workspace);
  return { schemaVersion: SCHEMA_VERSION, exportedAt, profiles: normalized.profiles, jobs: normalized.jobs, settings: normalized.settings };
}

export function validateImportObject(value) {
  if (!value || typeof value !== 'object') return { ok: false, error: 'invalid-root' };
  const migrated = migrateWorkspace(value);
  if (migrated.jobs.length > MAX_JOBS) return { ok: false, error: 'too-many-jobs' };
  if (migrated.profiles.length > MAX_PROFILES) return { ok: false, error: 'too-many-profiles' };
  const invalidJobs = migrated.jobs.filter(job => !job.company || !job.role).length;
  return { ok: true, data: migrated, warnings: invalidJobs ? ['missing-job-identity'] : [] };
}

export function parseImportText(text) {
  if (typeof text !== 'string' || new Blob([text]).size > MAX_IMPORT_BYTES) return { ok: false, error: 'file-too-large' };
  try {
    return validateImportObject(JSON.parse(text));
  } catch {
    return { ok: false, error: 'invalid-json' };
  }
}

export function mergeWorkspaces(current, incoming) {
  const base = migrateWorkspace(current);
  const next = migrateWorkspace(incoming);
  const jobs = [...base.jobs];
  next.jobs.forEach(job => {
    if (!findDuplicate(jobs, job)) jobs.push(normalizeJob(job));
  });
  const profileByName = new Set(base.profiles.map(profile => profile.name.trim().toLowerCase()));
  const profiles = [...base.profiles, ...ensureProfiles(next.profiles).filter(profile => !profileByName.has(profile.name.trim().toLowerCase()))];
  return { ...base, jobs, profiles };
}

export function jobsToCsv(jobs) {
  const headers = ['company','role','direction','status','priority','matchScore','source','url','location','workMode','salary','appliedAt','followUpAt','nextAction','contactName','contactChannel','rejectionReason','notes'];
  const escape = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return [headers.join(','), ...jobs.map(job => headers.map(header => escape(Array.isArray(job[header]) ? job[header].join('; ') : job[header])).join(','))].join('\n');
}
