import { createTranslator } from './lib/i18n.js';
import { loadWorkspace, saveWorkspace, LANG_KEY, emptyWorkspace } from './lib/storage.js';
import { ACTIVE_STATUSES, ARCHIVE_STATUSES, ALL_STATUSES, PRIORITIES, WORK_MODES, DIRECTIONS, createJob, createDemoJobs, findDuplicate, patchJob, sanitizeUrl, uid } from './lib/jobs.js';
import { localDateKey, isOverdue, isToday, formatLocalDate, addLocalDays } from './lib/date.js';
import { defaultProfiles, normalizeProfile } from './lib/profiles.js';
import { analyzeVacancy, extractVacancyIdentity } from './lib/matcher.js';
import { pipelineStats, sourcePerformance, weeklyActivity } from './lib/analytics.js';
import { buildBackup, jobsToCsv, mergeWorkspaces, parseImportText } from './lib/import-export.js';

const $ = id => document.getElementById(id);
const qsa = selector => [...document.querySelectorAll(selector)];
const ONBOARDING_KEY = 'anostosio-job-search-crm-onboarded';
const initialLang = new URLSearchParams(location.search).get('lang') || localStorage.getItem(LANG_KEY) || 'en';
const i18n = createTranslator(initialLang);
const loaded = loadWorkspace();
let workspace = loaded.workspace;
let currentView = location.hash.replace('#', '') || 'today';
let pipelineMode = 'board';
let editingId = null;
let analysis = null;
let pendingDuplicate = null;
let pendingImport = null;
let pendingConfirm = null;
let lastDeleted = null;
let savedView = '';
let lastFocused = null;

const filters = { search: '', status: '', priority: '', direction: '', workMode: '', source: '', match: '', followup: '' };

function t(key, vars) { return i18n.t(key, vars); }
function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char])); }
function listFromText(value = '') { return String(value).split(/[\n,;]/).map(item => item.trim()).filter(Boolean); }
function textFromList(value = []) { return Array.isArray(value) ? value.join('\n') : ''; }
function activeJobs() { return workspace.jobs.filter(job => ACTIVE_STATUSES.includes(job.status)); }
function getJob(id) { return workspace.jobs.find(job => job.id === id); }
function getProfile(id) { return workspace.profiles.find(profile => profile.id === id) || workspace.profiles[0]; }
function persist(message = '') { workspace = saveWorkspace(workspace); if (message) announce(message); }
function announce(message) { $('liveRegion').textContent = message; }

function download(name, content, type = 'application/json') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function showToast(message, undo = false) {
  const toast = $('toast');
  $('toastMessage').textContent = message;
  $('toastUndoBtn').hidden = !undo;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { toast.hidden = true; lastDeleted = null; }, 6500);
}

function openModal(dialog) {
  lastFocused = document.activeElement;
  dialog.showModal();
  requestAnimationFrame(() => {
    const focusable = dialog.querySelector('input:not([type="hidden"]), select, textarea, button, a[href]');
    focusable?.focus();
  });
}

function closeModal(dialog) {
  if (dialog.open) dialog.close();
  lastFocused?.focus?.();
  lastFocused = null;
}

function fillSelect(select, values, { all = '', labels = true } = {}) {
  const current = select.value;
  select.innerHTML = `${all ? `<option value="">${escapeHtml(all)}</option>` : ''}${values.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(labels ? t(value) : value)}</option>`).join('')}`;
  if ([...select.options].some(option => option.value === current)) select.value = current;
}

function applyLanguage() {
  document.documentElement.lang = i18n.lang;
  localStorage.setItem(LANG_KEY, i18n.lang);
  qsa('[data-i18n]').forEach(node => { node.textContent = t(node.dataset.i18n); });
  qsa('[data-i18n-placeholder]').forEach(node => { node.placeholder = t(node.dataset.i18nPlaceholder); });
  $('langToggle').textContent = i18n.lang === 'en' ? 'RU' : 'EN';
  fillSelect($('statusFilter'), [...ACTIVE_STATUSES, ...ARCHIVE_STATUSES], { all: t('allStatuses') });
  fillSelect($('priorityFilter'), PRIORITIES, { all: t('allPriorities') });
  fillSelect($('directionFilter'), DIRECTIONS, { all: t('allDirections') });
  fillSelect($('workModeFilter'), WORK_MODES, { all: t('allModes') });
  fillSelect($('status'), ALL_STATUSES);
  fillSelect($('priority'), PRIORITIES);
  fillSelect($('direction'), DIRECTIONS);
  fillSelect($('workMode'), WORK_MODES);
  renderProfileOptions();
  renderAll();
}

function setView(view, updateHash = true) {
  if (!['today', 'pipeline', 'analyzer', 'analytics', 'settings'].includes(view)) view = 'today';
  currentView = view;
  qsa('[data-view]').forEach(section => { const active = section.dataset.view === view; section.hidden = !active; section.classList.toggle('is-active', active); });
  qsa('[data-view-target]').forEach(button => button.classList.toggle('is-active', button.dataset.viewTarget === view));
  if (updateHash) history.replaceState(null, '', `#${view}`);
  if (view === 'pipeline') renderPipeline();
  if (view === 'analytics') renderAnalytics();
  if (view === 'settings') renderSettings();
  $('workspace').focus({ preventScroll: true });
}

function renderAll() {
  renderOnboarding();
  renderToday();
  renderPipeline();
  renderAnalyzer();
  renderAnalytics();
  renderSettings();
  if ($('onboarding').hidden) setView(currentView, false);
}

function renderOnboarding() {
  const shouldShow = !workspace.jobs.length && localStorage.getItem(ONBOARDING_KEY) !== '1';
  $('onboarding').hidden = !shouldShow;
  qsa('.view').forEach(view => {
    if (shouldShow) view.hidden = true;
  });
  document.querySelector('.app-nav').hidden = shouldShow;
}

function metricCard(label, value, note = '') {
  return `<article class="metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>${note ? `<small>${escapeHtml(note)}</small>` : ''}</article>`;
}

function actionForJob(job, today) {
  if (job.followUpAt && (isToday(job.followUpAt, today) || isOverdue(job.followUpAt, today))) return { type: 'followup', label: t('scheduleFollowUp') };
  if (['candidate', 'preparing'].includes(job.status)) return { type: 'applied', label: t('markApplied') };
  if (job.status === 'test') return { type: 'open', label: t('reviewTest') };
  if (job.status === 'applied') return { type: 'followup', label: t('scheduleFollowUp') };
  if (job.status === 'interview') return { type: 'open', label: t('edit') };
  return { type: 'open', label: t('edit') };
}

function renderToday() {
  const today = localDateKey();
  const active = activeJobs();
  const stats = pipelineStats(workspace.jobs, today);
  const overdue = active.filter(job => isOverdue(job.followUpAt, today));
  const due = active.filter(job => isToday(job.followUpAt, today));
  const waiting = active.filter(job => job.status === 'applied');
  const needApply = active.filter(job => ['candidate', 'preparing'].includes(job.status));
  const upcoming = active.filter(job => ['test', 'interview'].includes(job.status));
  const strongest = [...active].sort((a, b) => b.matchScore - a.matchScore || ({ veryHigh:4, high:3, medium:2, low:1 }[b.priority] - { veryHigh:4, high:3, medium:2, low:1 }[a.priority]))[0];
  $('todayStats').innerHTML = [
    metricCard(t('dueToday'), String(due.length)), metricCard(t('overdue'), String(overdue.length)), metricCard(t('waiting'), String(waiting.length)), metricCard(t('needApply'), String(needApply.length)), metricCard(t('upcoming'), String(upcoming.length)), metricCard(t('active'), String(stats.activeOpportunities)), metricCard(t('applicationsWeek'), String(stats.applicationsThisWeek))
  ].join('');

  const actionable = [...overdue, ...due.filter(job => !overdue.includes(job)), ...needApply, ...upcoming, ...waiting]
    .filter((job, index, list) => list.findIndex(item => item.id === job.id) === index)
    .slice(0, 8);
  $('todayActions').innerHTML = actionable.length ? actionable.map(job => {
    const action = actionForJob(job, today);
    const follow = job.followUpAt ? (isOverdue(job.followUpAt, today) ? t('overdueLabel') : formatLocalDate(job.followUpAt, i18n.lang)) : t(job.status);
    return `<article class="action-row"><div><strong>${escapeHtml(job.role)}</strong><span>${escapeHtml(job.company)} · ${escapeHtml(follow)}</span></div><button class="secondary-button compact-action" data-quick-action="${action.type}" data-job-id="${job.id}" type="button">${escapeHtml(action.label)}</button></article>`;
  }).join('') : `<div class="empty-inline">${escapeHtml(workspace.jobs.length ? t('noActions') : t('emptyToday'))}</div>`;

  if (strongest) {
    $('strongestTitle').textContent = strongest.role;
    $('strongestOpportunity').innerHTML = `<div class="opportunity-feature"><div class="feature-score"><strong>${strongest.matchScore}%</strong><span>${escapeHtml(t(strongest.priority))}</span></div><div><p>${escapeHtml(strongest.company)}</p><p class="muted">${escapeHtml([t(strongest.direction), t(strongest.workMode), strongest.location, strongest.salary].filter(Boolean).join(' · '))}</p><button class="text-button" data-open-job="${strongest.id}" type="button">${escapeHtml(t('edit'))} ↗</button></div></div>`;
  } else {
    $('strongestTitle').textContent = '—';
    $('strongestOpportunity').innerHTML = `<div class="empty-inline">${escapeHtml(t('emptyToday'))}</div>`;
  }
  bindDynamicActions($('view-today'));
}

function updateFiltersFromControls() {
  filters.search = $('searchInput').value.trim().toLowerCase();
  filters.status = $('statusFilter').value;
  filters.priority = $('priorityFilter').value;
  filters.direction = $('directionFilter').value;
  filters.workMode = $('workModeFilter').value;
  filters.source = $('sourceFilter').value;
  filters.match = $('matchFilter').value;
  filters.followup = $('followupFilter').value;
}

function filteredJobs() {
  updateFiltersFromControls();
  const today = localDateKey();
  let jobs = workspace.jobs.filter(job => {
    const haystack = [job.company, job.role, job.notes, job.source, job.location, job.direction].join(' ').toLowerCase();
    if (filters.search && !haystack.includes(filters.search)) return false;
    if (filters.status && job.status !== filters.status) return false;
    if (filters.priority && job.priority !== filters.priority) return false;
    if (filters.direction && job.direction !== filters.direction) return false;
    if (filters.workMode && job.workMode !== filters.workMode) return false;
    if (filters.source && job.source !== filters.source) return false;
    if (filters.match && job.matchScore < Number(filters.match)) return false;
    if (filters.followup === 'today' && !isToday(job.followUpAt, today)) return false;
    if (filters.followup === 'overdue' && !isOverdue(job.followUpAt, today)) return false;
    if (filters.followup === 'scheduled' && !job.followUpAt) return false;
    if (filters.followup === 'none' && job.followUpAt) return false;
    if (savedView === 'high' && !['veryHigh', 'high'].includes(job.priority)) return false;
    if (savedView === 'followup' && !(isToday(job.followUpAt, today) || isOverdue(job.followUpAt, today))) return false;
    if (savedView === 'archive' && !ARCHIVE_STATUSES.includes(job.status)) return false;
    if (savedView !== 'archive' && !filters.status && ARCHIVE_STATUSES.includes(job.status)) return false;
    return true;
  });
  return jobs.sort((a, b) => b.matchScore - a.matchScore || new Date(b.updatedAt) - new Date(a.updatedAt));
}

function sourceOptions() {
  const values = [...new Set(workspace.jobs.map(job => job.source).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const current = $('sourceFilter').value;
  $('sourceFilter').innerHTML = `<option value="">${escapeHtml(t('allSources'))}</option>${values.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('')}`;
  if (values.includes(current)) $('sourceFilter').value = current;
}

function savedViewButtons() {
  const items = [
    ['high', t('highPriority')], ['followup', t('savedFollowUp')], ['design', t('savedDesign')], ['ai', t('savedAI')], ['archive', t('archive')]
  ];
  $('savedViews').innerHTML = items.map(([value, label]) => `<button type="button" class="saved-view ${savedView === value ? 'is-active' : ''}" data-saved-view="${value}">${escapeHtml(label)}</button>`).join('');
}

function applySavedView(value) {
  savedView = savedView === value ? '' : value;
  resetFilterControls(false);
  if (savedView === 'design') $('directionFilter').value = 'design';
  if (savedView === 'ai') $('directionFilter').value = 'aiBuilder';
  savedViewButtons();
  renderPipeline();
}

function resetFilterControls(resetSaved = true) {
  $('searchInput').value = '';
  ['statusFilter','priorityFilter','directionFilter','workModeFilter','sourceFilter','matchFilter','followupFilter'].forEach(id => { $(id).value = ''; });
  if (resetSaved) savedView = '';
}

function followupText(job) {
  if (!job.followUpAt) return t('none');
  const today = localDateKey();
  if (isToday(job.followUpAt, today)) return t('today');
  if (isOverdue(job.followUpAt, today)) return t('overdueLabel');
  return formatLocalDate(job.followUpAt, i18n.lang);
}

function quickStatusSelect(job) {
  return `<select class="card-status" data-status-job="${job.id}" aria-label="${escapeHtml(t('status'))}">${ALL_STATUSES.map(status => `<option value="${status}" ${job.status === status ? 'selected' : ''}>${escapeHtml(t(status))}</option>`).join('')}</select>`;
}

function boardCard(job) {
  return `<article class="job-card" draggable="true" data-job-id="${job.id}" tabindex="0">
    <div class="job-card-top"><div><span class="company-line">${escapeHtml(job.company)}${job.demo ? ` · ${escapeHtml(t('demoLabel'))}` : ''}</span><h3>${escapeHtml(job.role)}</h3></div><strong class="score-badge">${job.matchScore}%</strong></div>
    <div class="tag-row"><span class="badge priority-${job.priority}">${escapeHtml(t(job.priority))}</span><span class="badge">${escapeHtml(t(job.direction))}</span><span class="badge">${escapeHtml(t(job.workMode))}</span></div>
    <dl class="mini-meta"><div><dt>${escapeHtml(t('location'))}</dt><dd>${escapeHtml(job.location || '—')}</dd></div><div><dt>${escapeHtml(t('salary'))}</dt><dd>${escapeHtml(job.salary || '—')}</dd></div><div><dt>${escapeHtml(t('followUp'))}</dt><dd>${escapeHtml(followupText(job))}</dd></div></dl>
    <div class="job-card-actions">${quickStatusSelect(job)}<button class="text-button" data-open-job="${job.id}" type="button">${escapeHtml(t('edit'))} ↗</button></div>
  </article>`;
}

function renderBoard(list) {
  const columns = savedView === 'archive' ? ARCHIVE_STATUSES : ACTIVE_STATUSES;
  $('pipelineBoard').innerHTML = columns.map(status => {
    const jobs = list.filter(job => job.status === status);
    return `<section class="board-column" data-drop-status="${status}" aria-labelledby="column-${status}"><div class="column-heading"><h2 id="column-${status}">${escapeHtml(t(status))}</h2><span>${jobs.length}</span></div><div class="column-list">${jobs.map(boardCard).join('') || `<div class="column-empty">—</div>`}</div></section>`;
  }).join('');
  bindBoardDnd();
}

function renderTable(list) {
  $('jobsBody').innerHTML = list.map(job => `<tr><td><button class="role-button" data-open-job="${job.id}" type="button"><strong>${escapeHtml(job.role)}</strong><span>${escapeHtml(job.company)}</span></button></td><td>${quickStatusSelect(job)}</td><td><strong>${job.matchScore}%</strong></td><td><span class="badge priority-${job.priority}">${escapeHtml(t(job.priority))}</span></td><td>${escapeHtml(t(job.direction))}</td><td>${escapeHtml([t(job.workMode), job.location].filter(Boolean).join(' · '))}</td><td>${escapeHtml(job.salary || '—')}</td><td>${escapeHtml(followupText(job))}</td><td><button class="text-button" data-open-job="${job.id}" type="button">↗</button></td></tr>`).join('');
}

function renderPipeline() {
  sourceOptions();
  savedViewButtons();
  const list = filteredJobs();
  $('pipelineBoard').hidden = pipelineMode !== 'board';
  $('pipelineTable').hidden = pipelineMode !== 'table';
  $('pipelineEmpty').hidden = list.length !== 0;
  if (pipelineMode === 'board') renderBoard(list);
  else renderTable(list);
  qsa('[data-pipeline-mode]').forEach(button => button.classList.toggle('is-active', button.dataset.pipelineMode === pipelineMode));
  bindDynamicActions($('view-pipeline'));
}

function bindBoardDnd() {
  qsa('.job-card[draggable="true"]').forEach(card => {
    card.addEventListener('dragstart', event => { event.dataTransfer.setData('text/plain', card.dataset.jobId); card.classList.add('is-dragging'); });
    card.addEventListener('dragend', () => card.classList.remove('is-dragging'));
  });
  qsa('[data-drop-status]').forEach(column => {
    column.addEventListener('dragover', event => { event.preventDefault(); column.classList.add('is-drop-target'); });
    column.addEventListener('dragleave', () => column.classList.remove('is-drop-target'));
    column.addEventListener('drop', event => {
      event.preventDefault(); column.classList.remove('is-drop-target');
      const id = event.dataTransfer.getData('text/plain');
      moveJobStatus(id, column.dataset.dropStatus);
    });
  });
}

function moveJobStatus(id, status) {
  const index = workspace.jobs.findIndex(job => job.id === id);
  if (index < 0 || !ALL_STATUSES.includes(status)) return;
  workspace.jobs[index] = patchJob(workspace.jobs[index], { status });
  persist(t('saved'));
  renderAll();
}

function handleQuickAction(type, id) {
  const job = getJob(id);
  if (!job) return;
  if (type === 'applied') {
    const index = workspace.jobs.findIndex(item => item.id === id);
    workspace.jobs[index] = patchJob(job, { status: 'applied', appliedAt: localDateKey(), followUpAt: job.followUpAt || addLocalDays(localDateKey(), 5) });
    persist(t('saved')); renderAll(); return;
  }
  if (type === 'followup') {
    openJob(id, 'application');
    $('followUpAt').focus();
    return;
  }
  openJob(id, type === 'open' ? 'overview' : 'application');
}

function bindDynamicActions(root = document) {
  root.querySelectorAll('[data-open-job]').forEach(button => button.onclick = () => openJob(button.dataset.openJob));
  root.querySelectorAll('[data-quick-action]').forEach(button => button.onclick = () => handleQuickAction(button.dataset.quickAction, button.dataset.jobId));
  root.querySelectorAll('[data-status-job]').forEach(select => select.onchange = () => moveJobStatus(select.dataset.statusJob, select.value));
  root.querySelectorAll('[data-saved-view]').forEach(button => button.onclick = () => applySavedView(button.dataset.savedView));
}

function renderProfileOptions() {
  const options = workspace.profiles.map(profile => `<option value="${escapeHtml(profile.id)}">${escapeHtml(profile.name)}</option>`).join('');
  ['analyzerProfile', 'jobProfile'].forEach(id => {
    const select = $(id);
    const current = select.value || workspace.settings.activeProfileId;
    select.innerHTML = options;
    select.value = workspace.profiles.some(profile => profile.id === current) ? current : workspace.profiles[0]?.id || '';
  });
}

function renderAnalyzer() {
  renderProfileOptions();
  if (!analysis) { $('analysisEmpty').hidden = false; $('analysisResult').hidden = true; return; }
  const dimensionLabels = { role:'roleDim', skills:'skillsDim', format:'formatDim', level:'levelDim', compensation:'compensationDim', risk:'riskDim' };
  const recommendationLabels = { 'apply-high':'applyHigh', apply:'apply', review:'review', skip:'skip' };
  $('analysisEmpty').hidden = true;
  $('analysisResult').hidden = false;
  $('analysisResult').innerHTML = `<div class="analysis-hero"><div><p class="kicker">${escapeHtml(t('match'))}</p><strong>${analysis.score}%</strong><span>${escapeHtml(t(analysis.verdict))}</span></div><p>${escapeHtml(t(recommendationLabels[analysis.recommendation]))}</p></div>
    <section class="analysis-section"><h3>${escapeHtml(t('breakdown'))}</h3><div class="score-breakdown">${analysis.dimensions.map(item => `<div><span>${escapeHtml(t(dimensionLabels[item.label]))}</span><progress max="${item.max}" value="${item.score}">${item.score}/${item.max}</progress><strong>${item.score}/${item.max}</strong></div>`).join('')}</div></section>
    <div class="analysis-columns"><section><h3>${escapeHtml(t('strongSignals'))}</h3><ul>${(analysis.strengths.length ? analysis.strengths : ['—']).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section><section><h3>${escapeHtml(t('gaps'))}</h3><ul>${(analysis.gaps.length ? analysis.gaps : ['—']).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section></div>
    ${analysis.hardBlockers.length ? `<section class="blocker-box"><h3>${escapeHtml(t('hardBlockers'))}</h3><ul>${analysis.hardBlockers.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>` : ''}
    <button id="analysisAddBtn" class="primary-button" type="button"><span>${escapeHtml(t('addToPipeline'))}</span><span>↗</span></button>`;
  $('analysisAddBtn').onclick = addAnalysisToPipeline;
}

function addAnalysisToPipeline() {
  if (!analysis) return;
  const identity = extractVacancyIdentity(analysis.raw);
  openJob(null, 'overview', {
    company: identity.company,
    role: identity.role,
    profileId: $('analyzerProfile').value,
    matchScore: analysis.score,
    priority: analysis.suggestedPriority,
    status: 'candidate',
    description: analysis.raw,
    strengths: analysis.strengths,
    gaps: [...analysis.gaps, ...analysis.hardBlockers]
  });
}

function renderAnalytics() {
  const stats = pipelineStats(workspace.jobs);
  $('analyticsMetrics').innerHTML = [metricCard(t('applicationsWeek'), String(stats.applicationsThisWeek)), metricCard(t('active'), String(stats.activeOpportunities)), metricCard(t('responseRate'), `${stats.responseRate}%`), metricCard(t('interviews'), String(stats.interviews)), metricCard(t('offers'), String(stats.offers)), metricCard(t('overdue'), String(stats.overdueFollowUps))].join('');
  const conversions = [['appliedToResponse', stats.conversion.appliedToResponse], ['responseToInterview', stats.conversion.responseToInterview], ['interviewToOffer', stats.conversion.interviewToOffer]];
  $('conversionChart').innerHTML = conversions.map(([key, value]) => `<div class="conversion-row"><span>${escapeHtml(t(key))}</span><div class="conversion-track"><span style="width:${value}%"></span></div><strong>${value}%</strong></div>`).join('');
  const activity = weeklyActivity(workspace.jobs);
  const max = Math.max(1, ...activity.map(item => item.count));
  $('weeklyChart').setAttribute('aria-label', activity.map(item => `${item.start}: ${item.count}`).join(', '));
  $('weeklyChart').innerHTML = activity.map(item => `<div class="bar-item"><div class="bar-value" style="height:${Math.max(4, (item.count / max) * 100)}%"><span>${item.count}</span></div><small>${item.start.slice(5)}</small></div>`).join('');
  const sources = sourcePerformance(workspace.jobs);
  $('sourceTable').innerHTML = sources.length ? `<div class="source-table"><div class="source-row source-head"><span>${escapeHtml(t('source'))}</span><span>${escapeHtml(t('applications'))}</span><span>${escapeHtml(t('responseRate'))}</span><span>${escapeHtml(t('interviews'))}</span><span>${escapeHtml(t('offers'))}</span></div>${sources.map(item => `<div class="source-row"><strong>${escapeHtml(item.source)}</strong><span>${item.applied}</span><span>${item.applied ? Math.round(item.responses / item.applied * 100) : 0}%</span><span>${item.interviews}</span><span>${item.offers}</span></div>`).join('')}</div>` : `<div class="empty-inline">${escapeHtml(t('emptyAnalytics'))}</div>`;
}

function renderSettings() {
  renderProfileOptions();
  const currentId = $('profileId').value || workspace.settings.activeProfileId || workspace.profiles[0]?.id;
  const profile = getProfile(currentId);
  $('profileTabs').innerHTML = workspace.profiles.map(item => `<button type="button" class="profile-tab ${item.id === profile?.id ? 'is-active' : ''}" data-profile-id="${escapeHtml(item.id)}">${escapeHtml(item.name)}</button>`).join('');
  qsa('[data-profile-id]').forEach(button => button.onclick = () => fillProfileForm(button.dataset.profileId));
  if (profile && $('profileId').value !== profile.id) fillProfileForm(profile.id, false);
}

function fillProfileForm(id, rerender = true) {
  const profile = getProfile(id);
  if (!profile) return;
  workspace.settings.activeProfileId = profile.id;
  $('profileId').value = profile.id;
  $('profileName').value = profile.name;
  $('targetRoles').value = textFromList(profile.targetRoles);
  $('strongSkills').value = textFromList(profile.strongSkills);
  $('developingSkills').value = textFromList(profile.developingSkills);
  $('excludedTasks').value = textFromList(profile.excludedTasks);
  $('preferredWorkMode').value = textFromList(profile.preferredWorkMode);
  $('allowedGeography').value = textFromList(profile.allowedGeography);
  $('salaryMinimum').value = profile.salaryMinimum || '';
  $('acceptableSeniority').value = textFromList(profile.acceptableSeniority);
  $('hardConstraints').value = textFromList(profile.hardConstraints);
  renderProfileOptions();
  if (rerender) renderSettings();
}

function profileFromForm() {
  return normalizeProfile({
    id: $('profileId').value || uid(), name: $('profileName').value,
    targetRoles: listFromText($('targetRoles').value), strongSkills: listFromText($('strongSkills').value), developingSkills: listFromText($('developingSkills').value), excludedTasks: listFromText($('excludedTasks').value), preferredWorkMode: listFromText($('preferredWorkMode').value), allowedGeography: listFromText($('allowedGeography').value), salaryMinimum: $('salaryMinimum').value, acceptableSeniority: listFromText($('acceptableSeniority').value), hardConstraints: listFromText($('hardConstraints').value)
  });
}

function activateDetailTab(tab) {
  qsa('[data-detail-tab]').forEach(button => button.classList.toggle('is-active', button.dataset.detailTab === tab));
  qsa('[data-detail-panel]').forEach(panel => panel.hidden = panel.dataset.detailPanel !== tab);
}

function openJob(id = null, tab = 'overview', prefill = {}) {
  editingId = id;
  const job = id ? getJob(id) : { status:'candidate', priority:'medium', direction:'other', workMode:'unknown', matchScore:0, strengths:[], gaps:[], profileId:workspace.settings.activeProfileId, ...prefill };
  if (!job) return;
  $('jobDialogTitle').textContent = id ? `${job.company} — ${job.role}` : t('addVacancy');
  const fields = ['company','role','source','location','salary','appliedAt','followUpAt','nextAction','contactName','contactChannel','rejectionReason','description','notes'];
  fields.forEach(field => { $(field).value = job[field] || ''; });
  $('direction').value = DIRECTIONS.includes(job.direction) ? job.direction : 'other';
  $('status').value = ALL_STATUSES.includes(job.status) ? job.status : 'candidate';
  $('priority').value = PRIORITIES.includes(job.priority) ? job.priority : 'medium';
  $('workMode').value = WORK_MODES.includes(job.workMode) ? job.workMode : 'unknown';
  $('matchScore').value = job.matchScore ?? 0;
  $('url').value = job.url || '';
  $('strengths').value = textFromList(job.strengths);
  $('gaps').value = textFromList(job.gaps);
  $('jobProfile').value = job.profileId && workspace.profiles.some(profile => profile.id === job.profileId) ? job.profileId : workspace.settings.activeProfileId;
  $('deleteJobBtn').hidden = !id;
  const safeUrl = sanitizeUrl(job.url);
  $('openJobLink').hidden = !safeUrl;
  $('openJobLink').href = safeUrl || '#';
  renderActivity(job);
  activateDetailTab(tab);
  openModal($('jobDialog'));
}

function jobFromForm() {
  return {
    company:$('company').value.trim(), role:$('role').value.trim(), direction:$('direction').value, status:$('status').value, priority:$('priority').value, matchScore:$('matchScore').value, source:$('source').value.trim(), url:$('url').value.trim(), location:$('location').value.trim(), workMode:$('workMode').value, salary:$('salary').value.trim(), description:$('description').value.trim(), notes:$('notes').value.trim(), appliedAt:$('appliedAt').value, followUpAt:$('followUpAt').value, nextAction:$('nextAction').value.trim(), contactName:$('contactName').value.trim(), contactChannel:$('contactChannel').value.trim(), strengths:listFromText($('strengths').value), gaps:listFromText($('gaps').value), rejectionReason:$('rejectionReason').value.trim(), profileId:$('jobProfile').value
  };
}

function renderActivity(job) {
  const labels = { created:'Created', status_changed:'Stage changed', applied:'Applied', followup_scheduled:'Follow-up scheduled', note_added:'Note added', interview:'Interview', test:'Test task', rejected:'Rejected', offer:'Offer' };
  $('activityList').innerHTML = job.history?.length ? [...job.history].reverse().map(item => `<article><span>${escapeHtml(new Date(item.at).toLocaleString(i18n.lang === 'ru' ? 'ru-RU' : 'en-GB'))}</span><strong>${escapeHtml(labels[item.type] || item.type.replaceAll('_', ' '))}</strong>${item.from && item.to ? `<small>${escapeHtml(t(item.from))} → ${escapeHtml(t(item.to))}</small>` : item.date ? `<small>${escapeHtml(formatLocalDate(item.date, i18n.lang))}</small>` : ''}</article>`).join('') : '—';
}

function saveJobForm(event, force = false) {
  event?.preventDefault?.();
  if (!$('jobForm').reportValidity()) return;
  const data = jobFromForm();
  if (!data.company || !data.role) return;
  if (data.url && !sanitizeUrl(data.url)) {
    $('url').setCustomValidity(i18n.lang === 'ru' ? 'Используй безопасную ссылку http/https.' : 'Use a safe http/https URL.');
    $('url').reportValidity();
    $('url').setCustomValidity('');
    return;
  }
  if (!editingId && !force) {
    const duplicate = findDuplicate(workspace.jobs, data);
    if (duplicate) {
      pendingDuplicate = { data, existingId: duplicate.id };
      $('duplicateSummary').textContent = `${duplicate.company} — ${duplicate.role}`;
      openModal($('duplicateDialog'));
      return;
    }
  }
  if (editingId) {
    const index = workspace.jobs.findIndex(job => job.id === editingId);
    workspace.jobs[index] = patchJob(workspace.jobs[index], data);
  } else {
    workspace.jobs.unshift(createJob(data));
  }
  persist(t('saved'));
  closeModal($('jobDialog'));
  editingId = null;
  renderAll();
  showToast(t('saved'));
}

function deleteEditingJob() {
  if (!editingId) return;
  const index = workspace.jobs.findIndex(job => job.id === editingId);
  if (index < 0) return;
  lastDeleted = { job: workspace.jobs[index], index };
  workspace.jobs.splice(index, 1);
  persist();
  closeModal($('jobDialog'));
  editingId = null;
  renderAll();
  showToast(t('deleted'), true);
}

function exportBackup() {
  download(`job-search-crm-v1-backup-${localDateKey()}.json`, JSON.stringify(buildBackup(workspace), null, 2));
}

function beginImport() { $('importInput').click(); }

async function handleImportFile(file) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { showToast('Import file is too large.'); return; }
  const parsed = parseImportText(await file.text());
  if (!parsed.ok) { showToast(i18n.lang === 'ru' ? 'Не удалось проверить backup.' : 'Could not validate this backup.'); return; }
  pendingImport = parsed.data;
  $('importPreview').innerHTML = `<div><span>${escapeHtml(t('profiles'))}</span><strong>${parsed.data.profiles.length}</strong></div><div><span>Vacancies</span><strong>${parsed.data.jobs.length}</strong></div><div><span>Schema</span><strong>v${parsed.data.schemaVersion}</strong></div>`;
  openModal($('importDialog'));
}

function requestConfirm(message, action, label = 'Confirm') {
  pendingConfirm = action;
  $('confirmMessage').textContent = message;
  $('confirmOkBtn').textContent = label;
  openModal($('confirmDialog'));
}

function doMergeImport() {
  workspace = mergeWorkspaces(workspace, pendingImport);
  persist(t('imported'));
  pendingImport = null;
  closeModal($('importDialog'));
  localStorage.setItem(ONBOARDING_KEY, '1');
  renderAll(); showToast(t('imported'));
}

function doReplaceImport() {
  if (!pendingImport) return;
  requestConfirm(t('confirmReplace'), () => {
    exportBackup();
    workspace = pendingImport;
    persist(t('imported'));
    pendingImport = null;
    closeModal($('importDialog'));
    localStorage.setItem(ONBOARDING_KEY, '1');
    renderAll(); showToast(t('imported'));
  }, t('replace'));
}

function startEmpty() {
  localStorage.setItem(ONBOARDING_KEY, '1');
  renderAll();
  setView('today');
}

function loadDemo() {
  workspace.jobs = createDemoJobs();
  workspace.settings.demoLoaded = true;
  persist();
  localStorage.setItem(ONBOARDING_KEY, '1');
  renderAll();
  setView('today');
}

function bindStaticEvents() {
  qsa('[data-view-target]').forEach(button => button.addEventListener('click', () => setView(button.dataset.viewTarget)));
  qsa('[data-pipeline-mode]').forEach(button => button.addEventListener('click', () => { pipelineMode = button.dataset.pipelineMode; renderPipeline(); }));
  $('langToggle').addEventListener('click', () => { i18n.lang = i18n.lang === 'en' ? 'ru' : 'en'; applyLanguage(); });
  $('headerAddBtn').addEventListener('click', () => openJob());
  $('closeJobDialog').addEventListener('click', () => closeModal($('jobDialog')));
  $('jobDialog').addEventListener('click', event => { if (event.target === $('jobDialog')) closeModal($('jobDialog')); });
  $('jobForm').addEventListener('submit', event => saveJobForm(event));
  $('deleteJobBtn').addEventListener('click', deleteEditingJob);
  qsa('[data-detail-tab]').forEach(button => button.addEventListener('click', () => activateDetailTab(button.dataset.detailTab)));
  $('analyzeBtn').addEventListener('click', () => {
    const raw = $('vacancyText').value.trim();
    if (!raw) { $('vacancyText').focus(); return; }
    const profile = getProfile($('analyzerProfile').value);
    analysis = analyzeVacancy(raw, profile);
    workspace.settings.activeProfileId = profile.id;
    persist();
    renderAnalyzer();
  });
  $('analyzerProfile').addEventListener('change', () => { workspace.settings.activeProfileId = $('analyzerProfile').value; persist(); });
  ['searchInput','statusFilter','priorityFilter','directionFilter','workModeFilter','sourceFilter','matchFilter','followupFilter'].forEach(id => $(id).addEventListener(id === 'searchInput' ? 'input' : 'change', () => { savedView = ''; renderPipeline(); }));
  $('resetFiltersBtn').addEventListener('click', () => { resetFilterControls(); renderPipeline(); });
  $('profileForm').addEventListener('submit', event => {
    event.preventDefault();
    const profile = profileFromForm();
    const index = workspace.profiles.findIndex(item => item.id === profile.id);
    if (index >= 0) workspace.profiles[index] = profile; else workspace.profiles.push(profile);
    workspace.settings.activeProfileId = profile.id;
    persist(t('saved')); renderSettings(); renderProfileOptions(); showToast(t('saved'));
  });
  $('newProfileBtn').addEventListener('click', () => {
    const profile = normalizeProfile({ id: uid(), name: i18n.lang === 'ru' ? 'Новый профиль' : 'New profile' });
    workspace.profiles.push(profile); workspace.settings.activeProfileId = profile.id; persist(); fillProfileForm(profile.id); $('profileName').select();
  });
  $('exportJsonBtn').addEventListener('click', exportBackup);
  $('exportCsvBtn').addEventListener('click', () => download(`job-search-crm-${localDateKey()}.csv`, `\ufeff${jobsToCsv(workspace.jobs)}`, 'text/csv;charset=utf-8'));
  $('importBtn').addEventListener('click', beginImport);
  $('onboardingImportBtn').addEventListener('click', beginImport);
  $('importInput').addEventListener('change', event => { handleImportFile(event.target.files?.[0]); event.target.value = ''; });
  $('cancelImportBtn').addEventListener('click', () => { pendingImport = null; closeModal($('importDialog')); });
  $('mergeImportBtn').addEventListener('click', doMergeImport);
  $('replaceImportBtn').addEventListener('click', doReplaceImport);
  $('clearWorkspaceBtn').addEventListener('click', () => requestConfirm(t('confirmClear'), () => {
    exportBackup();
    const profiles = workspace.profiles.length ? workspace.profiles : defaultProfiles();
    workspace = { ...emptyWorkspace(), profiles };
    persist();
    localStorage.setItem(ONBOARDING_KEY, '1');
    renderAll(); showToast(t('saved'));
  }, t('clearWorkspace')));
  $('confirmCancelBtn').addEventListener('click', () => { pendingConfirm = null; closeModal($('confirmDialog')); });
  $('confirmOkBtn').addEventListener('click', () => { const action = pendingConfirm; pendingConfirm = null; closeModal($('confirmDialog')); action?.(); });
  $('duplicateOpenBtn').addEventListener('click', () => { const id = pendingDuplicate?.existingId; pendingDuplicate = null; closeModal($('duplicateDialog')); closeModal($('jobDialog')); if (id) openJob(id); });
  $('duplicateCreateBtn').addEventListener('click', () => { const data = pendingDuplicate?.data; pendingDuplicate = null; closeModal($('duplicateDialog')); if (data) saveJobForm(null, true); });
  $('toastUndoBtn').addEventListener('click', () => {
    if (!lastDeleted) return;
    workspace.jobs.splice(lastDeleted.index, 0, lastDeleted.job); lastDeleted = null; persist(); renderAll(); $('toast').hidden = true;
  });
  $('startEmptyBtn').addEventListener('click', startEmpty);
  $('loadDemoBtn').addEventListener('click', loadDemo);
  window.addEventListener('hashchange', () => setView(location.hash.replace('#', '') || 'today', false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setView('pipeline'); setTimeout(() => $('searchInput').focus(), 0); }
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && $('jobDialog').open) { event.preventDefault(); $('jobForm').requestSubmit(); }
  });
}

bindStaticEvents();
applyLanguage();
if (loaded.migratedFrom && loaded.migratedFrom !== 'error') showToast(t('migrated'));
