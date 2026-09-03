import { normalizeJob } from './jobs.js';
import { ensureProfiles } from './profiles.js';

export const SCHEMA_VERSION = 3;
export const STORAGE_KEY = 'anostosio-job-search-crm-v3';
export const LEGACY_KEYS = ['anostosio-job-search-crm-v2', 'anostosio-job-search-crm-v1'];
export const LANG_KEY = 'anostosio-job-search-crm-lang';

export function emptyWorkspace() {
  return { schemaVersion: SCHEMA_VERSION, profiles: ensureProfiles([]), jobs: [], settings: { activeProfileId: 'design', demoLoaded: false } };
}

export function migrateWorkspace(input) {
  let jobs = [];
  let profiles = [];
  let settings = {};
  const value = input && typeof input === 'object' ? input : {};
  if (Array.isArray(value)) jobs = value;
  else {
    jobs = Array.isArray(value.jobs) ? value.jobs : [];
    profiles = Array.isArray(value.profiles) ? value.profiles : [];
    settings = value.settings && typeof value.settings === 'object' ? value.settings : {};
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    profiles: ensureProfiles(profiles),
    jobs: jobs.map(job => normalizeJob(job)),
    settings: {
      activeProfileId: String(settings.activeProfileId || 'design'),
      demoLoaded: Boolean(settings.demoLoaded)
    }
  };
}

export function loadWorkspace(storage = globalThis.localStorage) {
  try {
    const current = storage?.getItem?.(STORAGE_KEY);
    if (current) return { workspace: migrateWorkspace(JSON.parse(current)), migratedFrom: null };
    for (const key of LEGACY_KEYS) {
      const raw = storage?.getItem?.(key);
      if (!raw) continue;
      const workspace = migrateWorkspace(JSON.parse(raw));
      storage?.setItem?.(STORAGE_KEY, JSON.stringify(workspace));
      return { workspace, migratedFrom: key };
    }
  } catch {
    return { workspace: emptyWorkspace(), migratedFrom: 'error' };
  }
  return { workspace: emptyWorkspace(), migratedFrom: null };
}

export function saveWorkspace(workspace, storage = globalThis.localStorage) {
  const normalized = migrateWorkspace(workspace);
  storage?.setItem?.(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}
