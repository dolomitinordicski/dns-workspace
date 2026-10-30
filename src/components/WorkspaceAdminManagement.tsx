import { useState } from 'react';
import type { DNSWorkspaceLanguage } from '../services/foundation';
import type { DNSWorkspaceOrganization } from '../services/dnsOrganizations';
import { organizationName } from '../services/dnsOrganizations';
import type { DNSIdentity } from '../services/dnsIdentity';

type AdminTab = 'organizations' | 'users' | 'permissions' | 'usage';
type Props = {
  language: DNSWorkspaceLanguage;
  identity: DNSIdentity;
  organizations: DNSWorkspaceOrganization[];
};

/** Admin-only presentation. Does not provision accounts, change grants or write analytics. */
export function WorkspaceAdminManagement({ language, identity, organizations }: Props) {
  const [tab, setTab] = useState<AdminTab>('organizations');
  const [filter, setFilter] = useState('');
  const [draftOrg, setDraftOrg] = useState('');
  const [draftEmail, setDraftEmail] = useState('');
  const [draftArea, setDraftArea] = useState('');
  if (identity.state !== 'active' || !identity.profile.globalRoles.includes('dns-admin')) return null;
  const de = language === 'de';
  const tabs: { id: AdminTab; label: string }[] = [
    { id: 'organizations', label: de ? 'Organisationen' : 'Organizzazioni' },
    { id: 'users', label: de ? 'Benutzer' : 'Utenti' },
    { id: 'permissions', label: de ? 'Berechtigungen' : 'Permessi' },
    { id: 'usage', label: de ? 'Aktivität & Nutzung' : 'Attività & Utilizzo' },
  ];
  const filtered = organizations.filter(org =>
    `${org.canonicalName} ${org.id} ${org.reportingAreaIds.join(' ')}`
      .toLocaleLowerCase().includes(filter.toLocaleLowerCase()));
  return <section className="dns-card p-5 space-y-4" aria-label={de ? 'Organisations- und Zugangsverwaltung' : 'Gestione organizzazioni e accessi'}>
    <div>
      <div className="dns-kicker">{de ? 'Nur DNS Admin' : 'Solo DNS Admin'}</div>
      <h2 className="dns-section-title">{de ? 'Organisationen & Zugänge' : 'Organizzazioni & Accessi'}</h2>
      <p className="text-sm text-dns-muted">{de
        ? 'Verwaltungsübersicht. Änderungen an Benutzerkonten und Berechtigungen sind noch nicht aktiviert.'
        : 'Vista amministrativa. Le modifiche agli account e ai permessi non sono ancora abilitate.'}</p>
    </div>
    <div role="tablist" aria-label={de ? 'Verwaltungsbereiche' : 'Sezioni amministrative'} className="flex flex-wrap gap-2">
      {tabs.map(item => <button key={item.id} type="button" role="tab"
        aria-selected={tab === item.id} onClick={() => setTab(item.id)}
        className="dns-button" data-variant={tab === item.id ? 'primary' : 'secondary'}>{item.label}</button>)}
    </div>
    <div role="tabpanel" className="space-y-3">
      {tab === 'organizations' && <>
        <label className="block space-y-1">
          <span className="text-sm font-medium">{de ? 'Organisation suchen' : 'Cerca organizzazione'}</span>
          <input className="dns-input w-full" value={filter} onChange={event => setFilter(event.target.value)}
            placeholder={de ? 'Name oder Gebiet' : 'Nome o area'} />
        </label>
        <p className="text-sm text-dns-muted">{filtered.length} {de ? 'Organisationen aus DNS Core' : 'organizzazioni da DNS Core'}</p>
        {filtered.map(org => <article key={org.id} className="border-b py-2">
          <h3 className="font-semibold">{organizationName(org, language)}</h3>
          <p className="text-sm text-dns-muted">{org.id} · {org.reportingAreaIds.join(', ') || 'DNS'}</p>
          {org.address && <p className="text-sm">{[org.address.street, [org.address.postalCode, org.address.city].filter(Boolean).join(' '), org.address.country].filter(Boolean).join(', ')}</p>}
          {org.email && <p className="text-sm"><a href={`mailto:${org.email}`}>{org.email}</a></p>}
          {org.phone && <p className="text-sm">{org.phone}</p>}
          {org.website && <p className="text-sm">{org.website}</p>}
          {!org.address && !org.email && !org.phone && <p className="text-xs text-dns-muted">{de ? 'Kontaktangaben in DNS Core noch nicht verfügbar.' : 'Recapiti non ancora disponibili in DNS Core.'}</p>}
        </article>)}
        {!filtered.length && <p role="status">{de ? 'Keine Organisation gefunden.' : 'Nessuna organizzazione trovata.'}</p>}
      </>}
      {tab === 'users' && <div className="space-y-3">
        <p role="status" className="text-sm text-dns-muted">{de ? 'Vorschau ohne Speicherung: Es werden keine Einladungen versendet und keine Konten geändert.' : 'Anteprima senza salvataggio: non vengono inviati inviti né modificati account.'}</p>
        <label className="block space-y-1"><span className="text-sm">{de ? 'E-Mail des Benutzers' : 'Email utente'}</span>
          <input className="dns-input w-full" type="email" autoComplete="off" value={draftEmail} onChange={e => setDraftEmail(e.target.value)} />
        </label>
        <label className="block space-y-1"><span className="text-sm">{de ? 'Organisation' : 'Organizzazione'}</span>
          <select className="dns-input w-full" value={draftOrg} onChange={e => { setDraftOrg(e.target.value); setDraftArea(''); }}>
            <option value="">{de ? 'Organisation wählen' : 'Seleziona organizzazione'}</option>
            {organizations.filter(o => o.organizationType === 'tourism-organisation').map(o =>
              <option key={o.id} value={o.id}>{organizationName(o, language)}</option>)}
          </select>
        </label>
        <label className="block space-y-1"><span className="text-sm">{de ? 'Berechtigtes Gebiet' : 'Area autorizzata'}</span>
          <select className="dns-input w-full" value={draftArea} onChange={e => setDraftArea(e.target.value)} disabled={!draftOrg}>
            <option value="">{de ? 'Gebiet wählen' : 'Seleziona area'}</option>
            {organizations.find(o => o.id === draftOrg)?.reportingAreaIds.map(a => <option value={a} key={a}>{a}</option>)}
          </select>
        </label>
        <p className="text-sm">{de ? 'Profil: Data Entry und Flyer bearbeiten; Analytics und FAIR nur lesen.' : 'Profilo: Data Entry e Flyer modificabili; Analytics e FAIR in sola lettura.'}</p>
        <button type="button" className="dns-button" disabled title={de ? 'Erst nach sicherem Backend-Test verfügbar' : 'Disponibile dopo collaudo backend protetto'}>
          {de ? 'Einladung senden (noch nicht verfügbar)' : 'Invia invito (non ancora disponibile)'}
        </button>
      </div>}
      {tab === 'permissions' && <div className="space-y-2">
        <p className="text-sm text-dns-muted">{de ? 'Geplantes Standardprofil für Gebietsadministratoren (noch keine Berechtigungsänderung).' : 'Profilo Area Admin previsto (nessuna modifica ai permessi).'}</p>
        {[
          ['DNS Data Entry', de ? 'Lesen und Schreiben, eigenes Gebiet' : 'Lettura e scrittura, propria area'],
          ['DNS Flyer Studio', de ? 'Erstellen und Bearbeiten, eigenes Gebiet' : 'Creazione e modifica, propria area'],
          ['DNS Analytics', de ? 'Nur lesen' : 'Sola consultazione'],
          ['FAIR Model', de ? 'Nur lesen' : 'Sola consultazione'],
        ].map(([tool, access]) => <div className="flex flex-wrap gap-2 justify-between border-b py-2" key={tool}>
          <strong>{tool}</strong><span className="text-sm">{access}</span>
        </div>)}
      </div>}
      {tab === 'usage' && <div className="space-y-2">
        <h3 className="font-semibold">{de ? 'Aggregierte Nutzungsstatistik' : 'Statistiche aggregate di utilizzo'}</h3>
        <p role="status" className="text-sm text-dns-muted">{de
          ? 'Erfassung noch deaktiviert. Keine Nutzungszahlen verfügbar. Keine Einzelnutzer-Verfolgung vorgesehen.'
          : 'Raccolta non ancora attiva. Nessun dato di utilizzo disponibile. Nessun tracciamento individuale previsto.'}</p>
      </div>}
    </div>
  </section>;
}
