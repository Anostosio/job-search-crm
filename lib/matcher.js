function normalize(value = '') {
  return String(value).toLowerCase().replace(/ё/g, 'е');
}

function includesAny(text, values = []) {
  return values.filter(Boolean).filter(value => text.includes(normalize(value)));
}

function parseSalaryNumber(text) {
  const normalized = text.replace(/\s/g, '').replace(/,/g, '.');
  const rub = normalized.match(/(?:от|from)?(\d{2,3})(?:k|к|000)\s*(?:₽|руб|rub)/i);
  if (rub) return Number(rub[1]) * (Number(rub[1]) < 1000 ? 1000 : 1);
  const plain = normalized.match(/(?:salary|зарплат\w*|compensation)[^\d]{0,20}(\d{5,6})/i);
  return plain ? Number(plain[1]) : 0;
}

function dimension(score, max, label, signals = []) {
  return { label, score: Math.max(0, Math.min(max, Math.round(score))), max, signals };
}

export function analyzeVacancy(raw, profile) {
  const text = normalize(raw);
  const titleLine = String(raw || '').split('\n').map(s => s.trim()).find(Boolean) || '';
  const roleMatches = includesAny(text, profile.targetRoles);
  const strong = includesAny(text, profile.strongSkills);
  const developing = includesAny(text, profile.developingSkills);
  const excluded = includesAny(text, profile.excludedTasks);
  const hard = includesAny(text, profile.hardConstraints);
  const modes = includesAny(text, profile.preferredWorkMode);
  const geography = includesAny(text, profile.allowedGeography);
  const seniority = includesAny(text, profile.acceptableSeniority);
  const salaryFound = parseSalaryNumber(text);

  const roleScore = roleMatches.length ? Math.min(25, 16 + roleMatches.length * 4) : (profile.targetRoles.some(role => normalize(titleLine).includes(normalize(role))) ? 22 : 7);
  const skillsScore = Math.min(25, strong.length * 4 + developing.length * 2 + (strong.length ? 5 : 3));
  const formatScore = Math.min(15, (modes.length ? 8 : 4) + (geography.length ? 7 : 3));
  const levelScore = seniority.length ? 15 : (/senior|lead|head|principal|сеньор|руководител/.test(text) ? 4 : 10);
  const compensationScore = !profile.salaryMinimum || !salaryFound ? 6 : salaryFound >= profile.salaryMinimum ? 10 : 3;
  const riskScore = Math.max(0, 10 - excluded.length * 3 - hard.length * 7);

  const dimensions = [
    dimension(roleScore, 25, 'role', roleMatches),
    dimension(skillsScore, 25, 'skills', [...strong, ...developing]),
    dimension(formatScore, 15, 'format', [...modes, ...geography]),
    dimension(levelScore, 15, 'level', seniority),
    dimension(compensationScore, 10, 'compensation', salaryFound ? [String(salaryFound)] : []),
    dimension(riskScore, 10, 'risk', [...excluded, ...hard])
  ];

  const score = dimensions.reduce((sum, item) => sum + item.score, 0);
  const verdict = score >= 80 ? 'strong' : score >= 65 ? 'good' : score >= 50 ? 'stretch' : 'weak';
  const strengths = [
    ...roleMatches.slice(0, 3).map(value => `Role signal: ${value}`),
    ...strong.slice(0, 5).map(value => `Strong skill: ${value}`),
    ...modes.slice(0, 2).map(value => `Preferred format: ${value}`),
    ...geography.slice(0, 2).map(value => `Allowed geography: ${value}`)
  ];
  const gaps = [
    ...developing.slice(0, 4).map(value => `Developing skill: ${value}`),
    ...excluded.slice(0, 4).map(value => `Excluded task: ${value}`),
    ...(!seniority.length && /senior|lead|head|principal|сеньор|руководител/.test(text) ? ['Experience level may be above target'] : []),
    ...(profile.salaryMinimum && salaryFound && salaryFound < profile.salaryMinimum ? ['Compensation may be below minimum'] : [])
  ];
  const hardBlockers = hard.slice(0, 5);
  const recommendation = hardBlockers.length ? 'skip' : score >= 80 ? 'apply-high' : score >= 65 ? 'apply' : score >= 50 ? 'review' : 'skip';
  const suggestedPriority = hardBlockers.length ? 'low' : score >= 80 ? 'veryHigh' : score >= 68 ? 'high' : score >= 52 ? 'medium' : 'low';

  return { score, verdict, dimensions, strengths: [...new Set(strengths)], gaps: [...new Set(gaps)], hardBlockers, recommendation, suggestedPriority, raw: String(raw || '') };
}

export function extractVacancyIdentity(raw) {
  const lines = String(raw || '').split('\n').map(line => line.trim()).filter(Boolean).slice(0, 8);
  let company = '';
  let role = '';
  for (const line of lines) {
    const companyMatch = line.match(/^(?:company|компания)\s*[:—-]\s*(.+)$/i);
    const roleMatch = line.match(/^(?:role|position|vacancy|вакансия|позиция)\s*[:—-]\s*(.+)$/i);
    if (companyMatch) company = companyMatch[1].trim();
    if (roleMatch) role = roleMatch[1].trim();
  }
  return { company, role };
}
