import { collection, doc, getDoc, getDocs, getFirestore, query, where } from 'firebase/firestore';
import { passAuth } from './digitalPassApi';
import type { DNSWorkspaceOrganization } from './dnsOrganizations';

export type WorkspaceDashboardData = {
  trails: { openKm: number; totalKm: number; observedAt: string | null } | null;
  performance: { tickets: number; revenue: number; seasonId: string } | null;
  deadline: { deadlineAt: Date; enabled: boolean } | null;
  submission: { completed: number; total: number } | null;
};

type AnalyticsSnapshot = {
  seasonId?: string;
  baseline?: {
    labels?: { regions?: string[] };
    seasonOverview?: { totalTickets?: number; totalRevenue?: number };
    regional?: { totalQ?: number[]; totalR?: number[] };
  };
};

const ANALYTICS_REGION_BY_REPORTING_AREA: Record<string, string> = {
  antholzertal: 'Antholzertal',
  'gsiesertal-welsberg-taisten': 'Gsiesertal',
  'drei-zinnen': '3 Zinnen',
  osttirol: 'Osttirol',
  ahrntal: 'Ahrntal+Sand',
  'seiser-alm-dolomites-val-gardena': 'Seiser Alm/Val Gardena',
  'val-comelico': 'Comelico',
  'cortina-d-ampezzo': 'Cortina',
};

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

async function loadTrails(org: DNSWorkspaceOrganization) {
  const db = getFirestore(passAuth.app);
  const areaId = org.id === 'dolomiti-nordicski' ? 'all' : org.reportingAreaIds[0];
  if (!areaId) return null;
  try {
    const snapshot = await getDoc(doc(db, 'widgetPublicSnapshots', `2026-27__${areaId}`));
    const trails = snapshot.data()?.snapshot?.trails;
    const openKm = asNumber(trails?.openKm);
    const totalKm = asNumber(trails?.totalKm);
    if (openKm === null || totalKm === null) return null;
    return {
      openKm,
      totalKm,
      observedAt: typeof trails?.observedAt === 'string' ? trails.observedAt : null,
    };
  } catch {
    return null;
  }
}

async function loadPerformance(org: DNSWorkspaceOrganization) {
  const db = getFirestore(passAuth.app);
  try {
    const snapshot = await getDoc(doc(db, 'analyticsPublicSnapshots', '2025-26'));
    if (!snapshot.exists()) return null;
    const data = snapshot.data() as AnalyticsSnapshot;
    const seasonId = data.seasonId || '2025-26';
    if (org.id === 'dolomiti-nordicski') {
      const tickets = asNumber(data.baseline?.seasonOverview?.totalTickets);
      const revenue = asNumber(data.baseline?.seasonOverview?.totalRevenue);
      return tickets === null || revenue === null ? null : { tickets, revenue, seasonId };
    }
    const targetLabel = org.reportingAreaIds
      .map(id => ANALYTICS_REGION_BY_REPORTING_AREA[id])
      .find(Boolean);
    if (!targetLabel) return null;
    const labels = data.baseline?.labels?.regions ?? [];
    const index = labels.indexOf(targetLabel);
    if (index < 0) return null;
    const tickets = asNumber(data.baseline?.regional?.totalQ?.[index]);
    const revenue = asNumber(data.baseline?.regional?.totalR?.[index]);
    return tickets === null || revenue === null ? null : { tickets, revenue, seasonId };
  } catch {
    return null;
  }
}

async function loadDeadline() {
  const db = getFirestore(passAuth.app);
  try {
    const snapshot = await getDoc(doc(db, 'orderDeadlines', '2026-27'));
    const raw = snapshot.data();
    const deadlineAt = raw?.deadlineAt?.toDate?.();
    if (!(deadlineAt instanceof Date) || Number.isNaN(deadlineAt.getTime())) return null;
    return { deadlineAt, enabled: raw?.enabled !== false };
  } catch {
    return null;
  }
}

async function loadSubmission(org: DNSWorkspaceOrganization) {
  const db = getFirestore(passAuth.app);
  try {
    const base = collection(db, 'seasonalSubmissions');
    const snapshot = org.id === 'dolomiti-nordicski'
      ? await getDocs(query(base, where('seasonId', '==', '2026-27')))
      : await getDocs(query(base, where('organizationId', '==', org.id)));
    const rows = snapshot.docs
      .map(item => item.data() as { seasonId?: string; status?: string; domain?: string })
      .filter(item => item.seasonId === '2026-27');
    if (!rows.length) return null;
    const completed = rows.filter(item => item.status === 'submitted' || item.status === 'verified').length;
    return { completed, total: rows.length };
  } catch {
    return null;
  }
}

export async function loadWorkspaceDashboardData(org: DNSWorkspaceOrganization): Promise<WorkspaceDashboardData> {
  const [trails, performance, deadline, submission] = await Promise.all([
    loadTrails(org),
    loadPerformance(org),
    loadDeadline(),
    loadSubmission(org),
  ]);
  return { trails, performance, deadline, submission };
}
