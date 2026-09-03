import { uid } from './jobs.js';

export function defaultProfiles() {
  return [
    {
      id: 'design',
      name: 'Design',
      targetRoles: ['brand designer', 'graphic designer', 'visual designer', 'digital designer', 'бренд-дизайнер', 'графический дизайнер', 'визуальный дизайнер'],
      strongSkills: ['figma', 'photoshop', 'illustrator', 'branding', 'identity', 'typography', 'layout', 'айдентика', 'брендинг', 'типографика'],
      developingSkills: ['after effects', 'motion', 'indesign', '3d'],
      excludedTasks: ['smm', 'tiktok', 'marketplace cards', 'карточки маркетплейсов'],
      preferredWorkMode: ['remote'],
      allowedGeography: ['remote', 'europe', 'eu', 'russia', 'россия', 'удаленно', 'удалённо'],
      salaryMinimum: 50000,
      acceptableSeniority: ['intern', 'junior', 'middle', 'стажер', 'стажёр', 'джуниор', 'мидл'],
      hardConstraints: ['office only', 'on-site only', 'обязательный офис', 'только офис']
    },
    {
      id: 'ai-builder',
      name: 'AI Builder',
      targetRoles: ['ai product builder', 'automation builder', 'ai builder', 'product prototyper', 'vibe coding', 'ai automation'],
      strongSkills: ['figma', 'javascript', 'github', 'api', 'json', 'vercel', 'ai coding', 'codex', 'cursor', 'claude'],
      developingSkills: ['react', 'typescript', 'n8n', 'webhooks'],
      excludedTasks: ['senior backend', 'devops ownership', '24/7 support'],
      preferredWorkMode: ['remote'],
      allowedGeography: ['remote', 'europe', 'eu', 'worldwide', 'удаленно', 'удалённо'],
      salaryMinimum: 50000,
      acceptableSeniority: ['intern', 'junior', 'entry', 'стажер', 'стажёр', 'джуниор'],
      hardConstraints: ['5+ years', '4+ years', 'senior only', 'computer science degree required', 'office only', 'только офис']
    }
  ];
}

export function normalizeProfile(input = {}) {
  const list = key => Array.isArray(input[key]) ? input[key].map(String).map(s => s.trim()).filter(Boolean).slice(0, 80) : [];
  return {
    id: String(input.id || uid()),
    name: String(input.name || 'Profile').trim().slice(0, 80),
    targetRoles: list('targetRoles'),
    strongSkills: list('strongSkills'),
    developingSkills: list('developingSkills'),
    excludedTasks: list('excludedTasks'),
    preferredWorkMode: list('preferredWorkMode'),
    allowedGeography: list('allowedGeography'),
    salaryMinimum: Math.max(0, Number(input.salaryMinimum) || 0),
    acceptableSeniority: list('acceptableSeniority'),
    hardConstraints: list('hardConstraints')
  };
}

export function ensureProfiles(profiles) {
  const source = Array.isArray(profiles) && profiles.length ? profiles : defaultProfiles();
  const normalized = source.map(normalizeProfile);
  const ids = new Set();
  return normalized.map(profile => {
    if (!ids.has(profile.id)) { ids.add(profile.id); return profile; }
    const next = { ...profile, id: uid() }; ids.add(next.id); return next;
  });
}
