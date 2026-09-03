import test from 'node:test';import assert from 'node:assert/strict';
import {localDateKey,addLocalDays,isOverdue} from '../lib/date.js';
import {duplicateOf,sanitizeUrl,createJob} from '../lib/jobs.js';
import {migratePayload} from '../lib/storage.js';
import {analyzeVacancy} from '../lib/matcher.js';
import {validateImportText} from '../lib/import-export.js';
import {analyticsFor} from '../lib/analytics.js';
import {DEFAULT_PROFILES} from '../lib/profiles.js';

test('local date helpers use local calendar dates',()=>{const d=new Date(2026,8,3,23,30);assert.equal(localDateKey(d),'2026-09-03');assert.equal(addLocalDays(1,d),'2026-09-04');assert.equal(isOverdue('2026-09-02',d),true)});
test('URL sanitizer blocks unsafe protocols',()=>{assert.equal(sanitizeUrl('javascript:alert(1)'),'');assert.match(sanitizeUrl('https://example.com/job'),/^https:/)});
test('duplicate detection matches normalized URL or company + role',()=>{const jobs=[createJob({id:'1',company:'Acme',role:'Designer',url:'https://example.com/job/'})];assert.equal(duplicateOf({company:'X',role:'Y',url:'https://example.com/job'},jobs).id,'1');assert.equal(duplicateOf({company:' acme ',role:'DESIGNER'},jobs).id,'1')});
test('legacy arrays migrate into schema v3 without data loss',()=>{const m=migratePayload([{id:'a',company:'A',role:'R',match:77,followup:'2026-09-04'}]);assert.equal(m.schemaVersion,3);assert.equal(m.jobs[0].matchScore,77);assert.equal(m.jobs[0].followUpAt,'2026-09-04')});
test('matcher returns transparent weighted dimensions',()=>{const r=analyzeVacancy('Remote brand designer. Figma Photoshop Illustrator. Junior role.',DEFAULT_PROFILES[0]);assert.ok(r.score>50);assert.deepEqual(Object.keys(r.breakdown),['role','skills','format','level','compensation','risk'])});
test('import validation rejects invalid JSON and accepts legacy backup',()=>{assert.throws(()=>validateImportText('{'));const v=validateImportText(JSON.stringify([{company:'A',role:'B'}]));assert.equal(v.schemaVersion,3);assert.equal(v.jobs.length,1)});
test('pipeline analytics calculate conversions',()=>{const jobs=[createJob({status:'interview',appliedAt:localDateKey(),source:'HH'}),createJob({status:'applied',appliedAt:localDateKey(),source:'HH'})];const a=analyticsFor(jobs);assert.equal(a.applicationsThisWeek,2);assert.equal(a.interviews,1);assert.equal(a.conversion.appliedToResponse,50)});
