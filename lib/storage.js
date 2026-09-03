import {normalizeJob} from './jobs.js';
import {defaultProfiles,normalizeProfile} from './profiles.js';
export const STORAGE_KEY='anostosio-job-search-crm-v3';
export const LEGACY_KEYS=['anostosio-job-search-crm-v2','anostosio-job-search-crm-v1'];
export const SCHEMA_VERSION=3;
export function migratePayload(payload){if(Array.isArray(payload))return {schemaVersion:3,profiles:defaultProfiles(),jobs:payload.map(normalizeJob)};if(!payload||typeof payload!=='object')return {schemaVersion:3,profiles:defaultProfiles(),jobs:[]};const jobs=Array.isArray(payload.jobs)?payload.jobs:Array.isArray(payload.vacancies)?payload.vacancies:[];const profiles=Array.isArray(payload.profiles)&&payload.profiles.length?payload.profiles.map(normalizeProfile):defaultProfiles();return {schemaVersion:3,profiles,jobs:jobs.map(normalizeJob)}}
export function loadWorkspace(storage=localStorage){for(const key of [STORAGE_KEY,...LEGACY_KEYS]){try{const raw=storage.getItem(key);if(!raw)continue;const migrated=migratePayload(JSON.parse(raw));if(key!==STORAGE_KEY)storage.setItem(STORAGE_KEY,JSON.stringify(migrated));return migrated}catch{}}
return {schemaVersion:3,profiles:defaultProfiles(),jobs:[]}}
export function saveWorkspace(workspace,storage=localStorage){const clean={schemaVersion:3,profiles:(workspace.profiles||[]).map(normalizeProfile),jobs:(workspace.jobs||[]).map(normalizeJob)};storage.setItem(STORAGE_KEY,JSON.stringify(clean));return clean}
export function clearWorkspace(storage=localStorage){storage.removeItem(STORAGE_KEY);for(const key of LEGACY_KEYS)storage.removeItem(key)}
