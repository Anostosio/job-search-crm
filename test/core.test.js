import test from 'node:test';
import assert from 'node:assert/strict';
import { localDateKey, addLocalDays, isOverdue, parseLocalDate } from '../lib/date.js';
import { createJob, findDuplicate, normalizeUrl, sanitizeUrl } from '../lib/jobs.js';
import { migrateWorkspace } from '../lib/storage.js';
import { analyzeVacancy } from '../lib/matcher.js';
import { defaultProfiles } from '../lib/profiles.js';
import { parseImportText } from '../lib/import-export.js';
import { pipelineStats } from '../lib/analytics.js';

test('local date helper uses local calendar date and adds days safely', () => {
  const date = new Date(2026, 8, 3, 23, 30);
  assert.equal(localDateKey(date), '2026-09-03');
  assert.equal(addLocalDays('2026-09-03', 1), '2026-09-04');
  assert.equal(isOverdue('2026-09-02', '2026-09-03'), true);
  assert.equal(parseLocalDate('2026-02-31'), null);
});

test('URL sanitization only permits http and https and normalizes tracking params', () => {
  assert.equal(sanitizeUrl('javascript:alert(1)'), '');
  assert.match(sanitizeUrl('https://example.com/job'), /^https:\/\//);
  assert.equal(normalizeUrl('https://EXAMPLE.com/job/?utm_source=x#apply'), 'https://example.com/job');
});

test('duplicate detection checks normalized URL and company + role', () => {
  const jobs = [createJob({ company: 'Studio Orbit', role: 'Brand Designer', url: 'https://example.com/jobs/1?utm_source=hh' })];
  assert.equal(findDuplicate(jobs, { company: 'Other', role: 'Other', url: 'https://example.com/jobs/1' })?.id, jobs[0].id);
  assert.equal(findDuplicate(jobs, { company: ' studio orbit ', role: 'Brand  Designer' })?.id, jobs[0].id);
});

test('v1/v2-like jobs migrate to schema v3 without losing core fields', () => {
  const migrated = migrateWorkspace({ version: 2, jobs: [{ id: '1', company: 'A', role: 'Designer', match: 77, followup: '2026-09-04', status: 'applied', priority: 'high', notes: 'keep me' }] });
  assert.equal(migrated.schemaVersion, 3);
  assert.equal(migrated.jobs[0].matchScore, 77);
  assert.equal(migrated.jobs[0].followUpAt, '2026-09-04');
  assert.equal(migrated.jobs[0].notes, 'keep me');
  assert.ok(migrated.jobs[0].history.length >= 1);
});

test('matcher exposes dimension scores that sum to final score', () => {
  const profile = defaultProfiles()[0];
  const result = analyzeVacancy('Brand Designer\nRemote Europe\nFigma branding identity typography. Junior role.', profile);
  assert.equal(result.dimensions.reduce((sum, item) => sum + item.score, 0), result.score);
  assert.equal(result.dimensions.length, 6);
  assert.ok(result.score >= 50);
});

test('import validation rejects malformed JSON and accepts old backup shape', () => {
  assert.equal(parseImportText('{oops').ok, false);
  const result = parseImportText(JSON.stringify({ version: 2, jobs: [{ company: 'A', role: 'B' }] }));
  assert.equal(result.ok, true);
  assert.equal(result.data.schemaVersion, 3);
});

test('pipeline statistics calculate conversion and overdue follow-ups', () => {
  const jobs = [
    createJob({ company:'A', role:'One', status:'applied', appliedAt:'2026-09-01', followUpAt:'2026-09-02' }),
    createJob({ company:'B', role:'Two', status:'interview', appliedAt:'2026-09-01' }),
    createJob({ company:'C', role:'Three', status:'offer', appliedAt:'2026-09-02' })
  ];
  const stats = pipelineStats(jobs, '2026-09-03');
  assert.equal(stats.applicationsThisWeek, 3);
  assert.equal(stats.overdueFollowUps, 1);
  assert.equal(stats.interviews, 2);
  assert.equal(stats.offers, 1);
  assert.equal(stats.conversion.appliedToResponse, 67);
});

test('unsafe imported IDs are replaced with safe identifiers', () => {
  const job = createJob({ id:'\"><img src=x onerror=1>', company:'Safe', role:'Designer' });
  assert.match(job.id, /^[A-Za-z0-9._:-]+$/);
  assert.notEqual(job.id, '\"><img src=x onerror=1>');
});
