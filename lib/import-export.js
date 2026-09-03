import {migratePayload,SCHEMA_VERSION} from './storage.js';
import {normalizeJob} from './jobs.js';
import {normalizeProfile} from './profiles.js';
const MAX_BYTES=2_000_000;const MAX_JOBS=5000;const MAX_PROFILES=50;
export function validateImportText(text){if(typeof text!=='string')throw new Error('Invalid file');if(new Blob([text]).size>MAX_BYTES)throw new Error('Backup is too large');let parsed;try{parsed=JSON.parse(text)}catch{throw new Error('Invalid JSON')};const migrated=migratePayload(parsed);if(migrated.jobs.length>MAX_JOBS||migrated.profiles.length>MAX_PROFILES)throw new Error('Backup contains too many records');return {schemaVersion:SCHEMA_VERSION,profiles:migrated.profiles.map(normalizeProfile),jobs:migrated.jobs.map(normalizeJob)}}
export function backupPayload(workspace){return {schemaVersion:SCHEMA_VERSION,exportedAt:new Date().toISOString(),profiles:(workspace.profiles||[]).map(normalizeProfile),jobs:(workspace.jobs||[]).map(normalizeJob)}}
export function mergePayload(current,incoming){const jobs=new Map((current.jobs||[]).map(j=>[j.id,j]));for(const job of incoming.jobs||[])jobs.set(job.id,normalizeJob(job));const profiles=new Map((current.profiles||[]).map(p=>[p.id,p]));for(const p of incoming.profiles||[])profiles.set(p.id,normalizeProfile(p));return {schemaVersion:SCHEMA_VERSION,jobs:[...jobs.values()],profiles:[...profiles.values()]}}
const csvCell=v=>`"${String(v??'').replace(/"/g,'""')}"`;
export function jobsToCsv(jobs=[]){const fields=['company','role','direction','status','priority','matchScore','source','url','location','workMode','salary','appliedAt','followUpAt','nextAction','contactName','contactChannel','notes'];return [fields.join(','),...jobs.map(j=>fields.map(k=>csvCell(j[k])).join(','))].join('\n')}
export function downloadText(name,text,type='application/json'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),0)}
