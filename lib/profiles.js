import {uid} from './date.js';

const SAFE_ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const MAX_LIST_ITEMS=100;
const MAX_LIST_ITEM_LENGTH=500;

export const DEFAULT_PROFILES=[
{id:'design',name:'Design',targetRoles:['graphic designer','brand designer','visual designer','digital designer','дизайнер','бренд-дизайнер','графический дизайнер'],strongSkills:['figma','photoshop','illustrator','after effects','branding','identity','типографика','айдентика'],developingSkills:['indesign','motion','3d'],excludedTasks:['smm','tiktok','marketplace cards','карточки маркетплейсов','постоянный 3d'],preferredWorkMode:['remote'],allowedGeography:['remote','worldwide','europe','russia','удаленно','удалённо'],salaryMinimum:50000,acceptableSeniority:['junior','middle','intern','стажер','стажёр'],hardConstraints:['office only','только офис']},
{id:'ai-builder',name:'AI Builder',targetRoles:['ai builder','ai product builder','automation builder','vibe coder','product builder'],strongSkills:['figma','javascript','github','vercel','json','api','ai coding'],developingSkills:['react','typescript','n8n','webhooks'],excludedTasks:['senior backend ownership'],preferredWorkMode:['remote'],allowedGeography:['remote','worldwide','europe'],salaryMinimum:0,acceptableSeniority:['junior','intern','entry level'],hardConstraints:['office only','5+ years','computer science degree required']}
];

function normalizeProfileId(value){const raw=String(value??'').trim();return SAFE_ID.test(raw)?raw:uid()}
export function normalizeList(value){const list=Array.isArray(value)?value:String(value||'').split(/[,\n;]/);return list.slice(0,MAX_LIST_ITEMS).map(v=>String(v).trim().slice(0,MAX_LIST_ITEM_LENGTH)).filter(Boolean)}
export function normalizeProfile(input={}){return {id:normalizeProfileId(input.id),name:String(input.name||'Profile').slice(0,80),targetRoles:normalizeList(input.targetRoles),strongSkills:normalizeList(input.strongSkills),developingSkills:normalizeList(input.developingSkills),excludedTasks:normalizeList(input.excludedTasks),preferredWorkMode:normalizeList(input.preferredWorkMode),allowedGeography:normalizeList(input.allowedGeography),salaryMinimum:Math.min(1_000_000_000,Math.max(0,Number(input.salaryMinimum)||0)),acceptableSeniority:normalizeList(input.acceptableSeniority),hardConstraints:normalizeList(input.hardConstraints)}}
export function defaultProfiles(){return DEFAULT_PROFILES.map(p=>normalizeProfile(typeof structuredClone==='function'?structuredClone(p):JSON.parse(JSON.stringify(p))))}
