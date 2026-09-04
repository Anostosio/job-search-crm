import {migratePayload,SCHEMA_VERSION} from './storage.js';
import {normalizeJob} from './jobs.js';
import {normalizeProfile} from './profiles.js';

const MAX_BYTES=2_000_000;
const MAX_JOBS=5000;
const MAX_PROFILES=50;
const MAX_DEPTH=12;
const DANGEROUS_KEYS=new Set(['__proto__','prototype','constructor']);

function isRecord(value){return Boolean(value)&&typeof value==='object'&&!Array.isArray(value)}

function assertSafeObject(value,depth=0){
  if(depth>MAX_DEPTH)throw new Error('Backup structure is too deeply nested');
  if(Array.isArray(value)){for(const item of value)assertSafeObject(item,depth+1);return}
  if(!isRecord(value))return;
  for(const [key,child] of Object.entries(value)){
    if(DANGEROUS_KEYS.has(key))throw new Error('Backup contains unsafe object keys');
    assertSafeObject(child,depth+1);
  }
}

function validateEnvelope(parsed){
  if(Array.isArray(parsed)){
    if(parsed.length>MAX_JOBS)throw new Error('Backup contains too many records');
    if(parsed.some(item=>!isRecord(item)))throw new Error('Backup contains invalid vacancy records');
    return;
  }
  if(!isRecord(parsed))throw new Error('Backup must contain an object or a legacy vacancy array');
  const known=['schemaVersion','jobs','vacancies','profiles','exportedAt','settings'];
  if(!known.some(key=>Object.hasOwn(parsed,key)))throw new Error('Backup structure is not recognized');
  if(parsed.schemaVersion!==undefined){
    const version=Number(parsed.schemaVersion);
    if(!Number.isInteger(version)||version<1)throw new Error('Backup schema version is invalid');
    if(version>SCHEMA_VERSION)throw new Error('Backup was created by a newer version of Job Search CRM');
  }
  const jobs=parsed.jobs??parsed.vacancies??[];
  const profiles=parsed.profiles??[];
  if(!Array.isArray(jobs)||!Array.isArray(profiles))throw new Error('Backup jobs and profiles must be arrays');
  if(jobs.length>MAX_JOBS||profiles.length>MAX_PROFILES)throw new Error('Backup contains too many records');
  if(jobs.some(item=>!isRecord(item)))throw new Error('Backup contains invalid vacancy records');
  if(profiles.some(item=>!isRecord(item)))throw new Error('Backup contains invalid profile records');
}

export function validateImportText(text){
  if(typeof text!=='string')throw new Error('Invalid file');
  if(new Blob([text]).size>MAX_BYTES)throw new Error('Backup is too large');
  let parsed;
  try{parsed=JSON.parse(text)}catch{throw new Error('Invalid JSON')}
  assertSafeObject(parsed);
  validateEnvelope(parsed);
  const migrated=migratePayload(parsed);
  if(migrated.jobs.length>MAX_JOBS||migrated.profiles.length>MAX_PROFILES)throw new Error('Backup contains too many records');
  return {schemaVersion:SCHEMA_VERSION,profiles:migrated.profiles.map(normalizeProfile),jobs:migrated.jobs.map(normalizeJob)};
}

export function backupPayload(workspace){return {schemaVersion:SCHEMA_VERSION,exportedAt:new Date().toISOString(),profiles:(workspace.profiles||[]).map(normalizeProfile),jobs:(workspace.jobs||[]).map(normalizeJob)}}
export function mergePayload(current,incoming){const jobs=new Map((current.jobs||[]).map(j=>[j.id,j]));for(const job of incoming.jobs||[])jobs.set(job.id,normalizeJob(job));const profiles=new Map((current.profiles||[]).map(p=>[p.id,p]));for(const p of incoming.profiles||[])profiles.set(p.id,normalizeProfile(p));return {schemaVersion:SCHEMA_VERSION,jobs:[...jobs.values()],profiles:[...profiles.values()]}}

const safeSpreadsheetValue=value=>{const text=String(value??'');return /^\s*[=+\-@]/.test(text)?`'${text}`:text};
const csvCell=value=>`"${safeSpreadsheetValue(value).replace(/"/g,'""')}"`;
export function jobsToCsv(jobs=[]){const fields=['company','role','direction','status','priority','matchScore','source','url','location','workMode','salary','appliedAt','followUpAt','nextAction','contactName','contactChannel','notes'];return [fields.join(','),...jobs.map(j=>fields.map(k=>csvCell(j[k])).join(','))].join('\n')}

function safeFilename(name){const clean=String(name||'download').replace(/[^a-z0-9._-]+/gi,'_').slice(0,180);return clean||'download'}
export function downloadText(name,text,type='application/json'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=safeFilename(name);a.click();setTimeout(()=>URL.revokeObjectURL(a.href),0)}
