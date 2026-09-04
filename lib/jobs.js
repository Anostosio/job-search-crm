import {uid,localDateKey} from './date.js';

export const ACTIVE_STATUSES=['candidate','preparing','applied','test','interview','offer'];
export const ALL_STATUSES=[...ACTIVE_STATUSES,'rejected','closed'];
export const PRIORITIES=['veryHigh','high','medium','low'];
export const WORK_MODES=['remote','hybrid','office','flexible'];
export const DIRECTIONS=['design','aiBuilder','other'];

const SAFE_ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const MAX_URL_LENGTH=2048;
const MAX_LIST_ITEMS=100;
const MAX_LIST_ITEM_LENGTH=500;

export function clampScore(value){const n=Number(value);return Number.isFinite(n)?Math.min(100,Math.max(0,Math.round(n))):0}
export function normalizeText(value=''){return String(value).trim().toLowerCase().replace(/\s+/g,' ')}

export function normalizeId(value,{allowEmpty=false}={}){
  const raw=String(value??'').trim();
  if(!raw&&allowEmpty)return '';
  return SAFE_ID.test(raw)?raw:uid();
}

function normalizeReferenceId(value){
  const raw=String(value??'').trim();
  if(!raw)return '';
  return SAFE_ID.test(raw)?raw:'';
}

function normalizeDateKey(value){
  const raw=String(value??'').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(raw)?raw:'';
}

function normalizeIso(value,fallback){
  const raw=String(value??'').trim();
  const parsed=Date.parse(raw);
  return Number.isFinite(parsed)?new Date(parsed).toISOString():fallback;
}

function normalizeStringList(value,maxItems=MAX_LIST_ITEMS,maxLength=MAX_LIST_ITEM_LENGTH){
  const list=Array.isArray(value)?value:String(value||'').split('\n');
  return list.slice(0,maxItems).map(item=>String(item).slice(0,maxLength)).filter(Boolean);
}

function normalizeHistory(value){
  if(!Array.isArray(value))return [];
  return value.filter(item=>item&&typeof item==='object'&&!Array.isArray(item)).slice(-300).map(item=>({
    id:normalizeId(item.id),
    type:String(item.type||'event').slice(0,64),
    at:normalizeIso(item.at,new Date().toISOString()),
    details:String(item.details||'').slice(0,1000)
  }));
}

export function sanitizeUrl(value=''){
  const raw=String(value||'').trim();
  if(!raw||raw.length>MAX_URL_LENGTH)return '';
  try{
    const u=new URL(raw);
    if(!['http:','https:'].includes(u.protocol)||u.username||u.password||!u.hostname)return '';
    return u.href;
  }catch{return ''}
}

export function normalizedUrl(value=''){const safe=sanitizeUrl(value);if(!safe)return '';const u=new URL(safe);u.hash='';u.searchParams.sort();return u.href.replace(/\/$/,'').toLowerCase()}
export function duplicateOf(candidate,jobs=[],ignoreId=''){const url=normalizedUrl(candidate.url);const company=normalizeText(candidate.company);const role=normalizeText(candidate.role);return jobs.find(j=>j.id!==ignoreId&&((url&&normalizedUrl(j.url)===url)||(company&&role&&normalizeText(j.company)===company&&normalizeText(j.role)===role)))||null}
export function historyEvent(type,details=''){return {id:uid(),type:String(type||'event').slice(0,64),at:new Date().toISOString(),details:String(details||'').slice(0,1000)}}
export function createJob(input={}){const now=new Date().toISOString();return normalizeJob({...input,id:input.id||uid(),createdAt:input.createdAt||now,updatedAt:input.updatedAt||now,history:Array.isArray(input.history)&&input.history.length?input.history:[historyEvent('created')]})}

export function normalizeJob(input={}){
  const now=new Date().toISOString();
  const status=ALL_STATUSES.includes(input.status)?input.status:'candidate';
  const priority=PRIORITIES.includes(input.priority)?input.priority:'medium';
  return {
    id:normalizeId(input.id),
    company:String(input.company||'').slice(0,160),
    role:String(input.role||'').slice(0,200),
    direction:DIRECTIONS.includes(input.direction)?input.direction:'other',
    status,
    priority,
    matchScore:clampScore(input.matchScore??input.match??0),
    profileId:normalizeReferenceId(input.profileId),
    source:String(input.source||'').slice(0,120),
    url:sanitizeUrl(input.url),
    location:String(input.location||'').slice(0,180),
    workMode:WORK_MODES.includes(input.workMode)?input.workMode:'flexible',
    salary:String(input.salary||'').slice(0,180),
    description:String(input.description||'').slice(0,12000),
    notes:String(input.notes||'').slice(0,8000),
    createdAt:normalizeIso(input.createdAt,now),
    updatedAt:normalizeIso(input.updatedAt,now),
    appliedAt:normalizeDateKey(input.appliedAt),
    followUpAt:normalizeDateKey(input.followUpAt??input.followup),
    nextAction:String(input.nextAction||'').slice(0,300),
    contactName:String(input.contactName||'').slice(0,160),
    contactChannel:String(input.contactChannel||'').slice(0,160),
    strengths:normalizeStringList(input.strengths),
    gaps:normalizeStringList(input.gaps),
    rejectionReason:String(input.rejectionReason||'').slice(0,1000),
    history:normalizeHistory(input.history),
    isDemo:Boolean(input.isDemo)
  };
}

export function patchJob(job,patch,eventType=''){const next=normalizeJob({...job,...patch,updatedAt:new Date().toISOString()});if(eventType)next.history=[...(job.history||[]),historyEvent(eventType)].slice(-300);return next}
export function markApplied(job,date=localDateKey()){return patchJob(job,{status:'applied',appliedAt:job.appliedAt||date},'applied')}
