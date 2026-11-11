import baseline from '../data/ai-collaboration-preliminary.json';
import type { ImpactRange } from './types';

type Revision = { periodEnd: string; collaborationHours: ImpactRange };

/** Each new manual revision is explicitly dated; GitHub activity never changes these hours. */
export function currentCollaborationEstimate(): { hours: ImpactRange; periodEnd: string; hoursPerWorkday: number } {
  const revisions = baseline.futureRevisions as Revision[];
  const newest = revisions.at(-1);
  return {
    hours: newest?.collaborationHours ?? baseline.collaborationHours,
    periodEnd: newest?.periodEnd ?? baseline.periodEnd,
    hoursPerWorkday: baseline.hoursPerWorkday,
  };
}
