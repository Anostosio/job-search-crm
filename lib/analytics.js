import { ACTIVE_STATUSES } from './jobs.js';
import { isOverdue, localDateKey, startOfLocalWeek } from './date.js';

export function pipelineStats(jobs, today = localDateKey()) {
  const weekStart = startOfLocalWeek(new Date(`${today}T12:00:00`));
  const appliedJobs = jobs.filter(job => job.appliedAt);
  const responded = appliedJobs.filter(job => ['test', 'interview', 'offer', 'rejected'].includes(job.status) || job.history?.some(item => ['test', 'interview', 'offer', 'rejected'].includes(item.type)));
  const interviews = jobs.filter(job => job.status === 'interview' || job.status === 'offer' || job.history?.some(item => item.type === 'interview'));
  const offers = jobs.filter(job => job.status === 'offer' || job.history?.some(item => item.type === 'offer'));
  const applicationsThisWeek = appliedJobs.filter(job => job.appliedAt >= weekStart && job.appliedAt <= today).length;
  const overdueFollowUps = jobs.filter(job => ACTIVE_STATUSES.includes(job.status) && isOverdue(job.followUpAt, today)).length;
  return {
    applicationsThisWeek,
    activeOpportunities: jobs.filter(job => ACTIVE_STATUSES.includes(job.status)).length,
    responseRate: appliedJobs.length ? Math.round((responded.length / appliedJobs.length) * 100) : 0,
    interviews: interviews.length,
    offers: offers.length,
    overdueFollowUps,
    conversion: {
      appliedToResponse: appliedJobs.length ? Math.round((responded.length / appliedJobs.length) * 100) : 0,
      responseToInterview: responded.length ? Math.round((interviews.length / responded.length) * 100) : 0,
      interviewToOffer: interviews.length ? Math.round((offers.length / interviews.length) * 100) : 0
    }
  };
}

export function sourcePerformance(jobs) {
  const groups = new Map();
  jobs.forEach(job => {
    const source = job.source || 'Other';
    if (!groups.has(source)) groups.set(source, { source, total: 0, applied: 0, responses: 0, interviews: 0, offers: 0 });
    const group = groups.get(source);
    group.total += 1;
    if (job.appliedAt) group.applied += 1;
    if (['test', 'interview', 'offer', 'rejected'].includes(job.status) || job.history?.some(item => ['test', 'interview', 'offer', 'rejected'].includes(item.type))) group.responses += 1;
    if (job.status === 'interview' || job.status === 'offer' || job.history?.some(item => item.type === 'interview')) group.interviews += 1;
    if (job.status === 'offer' || job.history?.some(item => item.type === 'offer')) group.offers += 1;
  });
  return [...groups.values()].sort((a, b) => b.applied - a.applied || b.total - a.total);
}

export function weeklyActivity(jobs, today = localDateKey(), weeks = 8) {
  const end = new Date(`${today}T12:00:00`);
  const currentStart = new Date(`${startOfLocalWeek(end)}T12:00:00`);
  const rows = [];
  for (let index = weeks - 1; index >= 0; index -= 1) {
    const start = new Date(currentStart);
    start.setDate(start.getDate() - index * 7);
    const finish = new Date(start);
    finish.setDate(finish.getDate() + 6);
    const startKey = localDateKey(start);
    const finishKey = localDateKey(finish);
    rows.push({
      start: startKey,
      end: finishKey,
      count: jobs.filter(job => job.appliedAt && job.appliedAt >= startKey && job.appliedAt <= finishKey).length
    });
  }
  return rows;
}
