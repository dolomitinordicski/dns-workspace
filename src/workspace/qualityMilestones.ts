/**
 * Canonical DNS area-quality milestones used by Workspace.
 *
 * Source documents (Google Drive, supplied by DNS):
 * - DNS_Qualitätskriterien area-criteri di qualità area.pdf
 *   Drive file ID: 1xGsTWC89i1Uik63azDPyQHYW0pVzjIW6
 * - DNS_Reglement-regolarmento.pdf
 *   Drive file ID: 1wclPWpS75qJdx0rkpWxEQgigvN7rROKy
 *
 * Do not broaden these requirements in UI copy without updating the source contract.
 */
export const DNS_QUALITY_MILESTONES = {
  december08: {
    month: 12,
    day: 8,
    minimumPreparedKm: 5,
    label: {
      it: 'Almeno 5 km di piste preparate',
      de: 'Mindestens 5 km präparierte Loipen',
    },
    note: {
      it: 'Ogni area deve poter garantire 5 km, salvo condizioni meteo che lo rendano impossibile.',
      de: 'Jede Area muss 5 km garantieren können, außer wenn die Wetterbedingungen dies unmöglich machen.',
    },
  },
  december23: {
    month: 12,
    day: 23,
    label: {
      it: 'Apertura di tutte le piste principali',
      de: 'Öffnung aller Hauptloipen',
    },
    minimumTrailSet: {
      continuous10Km: 10,
      continuous5Km: 5,
      beginnerKm: 0.5,
    },
    note: {
      it: 'Dal 23/12 devono essere preparate anche le tre piste minime: 10 km, 5 km e 500 m principianti.',
      de: 'Ab 23.12 müssen auch die drei Mindestloipen präpariert sein: 10 km, 5 km und 500 m Anfängerloipe.',
    },
  },
  maintenanceMonthsFromDecember23: 3,
} as const;
