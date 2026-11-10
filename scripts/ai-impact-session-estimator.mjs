/**
 * Transparent heuristic of GitHub-observable development activity.
 * Not measured human hours, not AI inference time, not equivalent developer effort.
 * All repositories are combined before sessionizing to avoid counting parallel work twice.
 */
export function estimateDevelopmentSessions(commits, { gapMinutes = 90 } = {}) {
  const times = [...new Set(commits
    .map(x => Date.parse(x.date))
    .filter(n => Number.isFinite(n)))].sort((a,b) => a-b);
  if (!times.length) return { sessions: 0, estimateHours: { low: 0, central: 0, high: 0 }, methodology: 'commit-session-v1' };
  const gap = gapMinutes * 60_000;
  const sessions = [];
  let current = [times[0]];
  for (const t of times.slice(1)) {
    const previous = current[current.length - 1];
    const sameDay = new Date(t).toISOString().slice(0,10) === new Date(previous).toISOString().slice(0,10);
    if (sameDay && t - previous <= gap) current.push(t);
    else { sessions.push(current); current = [t]; }
  }
  sessions.push(current);
  const mins = (base, weight) => sessions.reduce((sum, group) => {
    const span = (group[group.length-1] - group[0]) / 60000;
    return sum + base + span * weight;
  },0);
  const round = x => Math.round(x / 60 * 10)/10;
  return {
    sessions: sessions.length,
    estimateHours: { low: round(mins(5, 0.35)), central: round(mins(15, 0.7)), high: round(mins(30, 1)) },
    methodology: 'commit-session-v1',
    gapMinutes,
    disclaimer: 'Proxy of GitHub-observable active periods, not actual AI/human work hours.',
  };
}
