import { useState } from "react";

import {
  ApiError,
  type ApplicationAcces,
  type GroupeAcces,
  type MembreAvecAcces,
  type MembreProfile,
  getApplicationMembres,
  getApplications,
  getGroupes,
  getGroupesMembreApplication,
  getMembres,
  setGroupeMembreApplication,
  setMembreApplication,
} from "../api.js";
import { useResource } from "../useResource.js";
import { Tabs } from "./Tabs.js";
import { roleLabel } from "./utilisateursShared.js";

/**
 * Central access governance, one tab per application. Inside a tab: exactly WHO has
 * access to that application (LEVEL 1, visibility) and, for each of them, which groups
 * (rights, LEVEL 2/3) they hold. Access first, then rights: a member must be granted
 * access before a group can be assigned. Groups are created in « Accès & groupes »; here
 * they are only selected and assigned. Every change is audited server-side.
 */
export function GouvernanceAcces({ token }: { token: string }): JSX.Element {
  const apps = useResource(() => getApplications(token), [token]);
  const liste = apps.data ?? [];
  const [actif, setActif] = useState<string | null>(null);
  const codeActif = actif ?? liste[0]?.code ?? null;
  const appActive = liste.find((a) => a.code === codeActif) ?? null;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Gouvernance des accès</h1>
          <p className="muted">
            Un onglet par application. On donne d'abord la <strong>visibilité</strong> (le membre voit et ouvre
            l'application), puis les <strong>droits</strong> en l'ajoutant à un groupe. Voir une application ne rend jamais
            un membre administrateur : les deux actions sont distinctes. Chaque changement est journalisé.
          </p>
        </div>
      </header>

      {apps.error && <p className="banner banner-error">{apps.error}</p>}
      {liste.length > 0 && (
        <Tabs
          tabs={liste.map((a) => ({ id: a.code, label: a.nom.replace(/^ADSUM\s+/i, "") }))}
          active={codeActif ?? ""}
          onChange={(id) => setActif(id)}
        />
      )}

      {appActive && <AppOnglet key={appActive.code} token={token} app={appActive} />}
    </div>
  );
}

function AppOnglet({ token, app }: { token: string; app: ApplicationAcces }): JSX.Element {
  const membres = useResource(() => getApplicationMembres(token, app.code), [token, app.code]);
  const [q, setQ] = useState("");
  const [resultats, setResultats] = useState<MembreProfile[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);

  function nomDe(m: MembreProfile | MembreAvecAcces): string {
    const nom = "nom" in m && typeof m.nom === "string" ? m.nom : "";
    const prenoms = "prenoms" in m ? (m as MembreProfile).prenoms ?? "" : "";
    return `${prenoms} ${nom}`.trim() || m.matricule || ("membre_id" in m ? m.membre_id : (m as MembreProfile).id);
  }

  function run<T>(p: Promise<T>, message: string): void {
    setBusy(true); setError(null); setNote(null);
    p.then(() => { setNote(message); membres.reload(); })
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "Erreur réseau"))
      .finally(() => setBusy(false));
  }

  function chercher(e: React.FormEvent): void {
    e.preventDefault();
    const terme = q.trim();
    if (!terme) return;
    setBusy(true); setError(null);
    getMembres(token, { q: terme, limit: 20 })
      .then(setResultats)
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Erreur réseau"))
      .finally(() => setBusy(false));
  }

  const dejaAcces = new Set((membres.data ?? []).map((m) => m.membre_id));

  if (app.est_defaut) {
    return (
      <>
        {app.description && <p className="muted small" style={{ marginTop: 4 }}>{app.description}</p>}
        <section className="card">
          <h2 className="card-title">Application par défaut</h2>
          <p className="muted">
            <strong>{app.nom}</strong> est visible par défaut par <strong>tous les membres</strong>, sans qu'on ait à
            accorder l'accès. La visibilité y est automatique : il n'y a donc rien à donner ni à révoquer ici. Les
            droits internes à l'espace membre se gèrent avec les rôles et groupes habituels.
          </p>
        </section>
      </>
    );
  }

  return (
    <>
      {app.description && <p className="muted small" style={{ marginTop: 4 }}>{app.description}</p>}
      {error && <p className="banner banner-error">{error}</p>}
      {note && <p className="banner banner-ok">{note}</p>}

      <section className="card">
        <h2 className="card-title">Étape 1 - Donner accès (visibilité)</h2>
        <p className="muted small">Recherchez un membre et accordez-lui l'accès à <strong>{app.nom}</strong>. Il verra alors l'application dans « Mes applications ». Cela ne lui donne encore aucun droit.</p>
        <form className="toolbar" onSubmit={chercher}>
          <input className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, prénom, matricule..." />
          <button type="submit" className="btn btn-primary btn-inline" disabled={busy || !q.trim()}>Rechercher</button>
        </form>
        {resultats.length > 0 && (
          <ul className="list" style={{ marginTop: 8 }}>
            {resultats.map((m) => (
              <li key={m.id} className="list-row" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ flex: 1 }}><strong>{nomDe(m)}</strong> <span className="muted small">{m.matricule}</span></span>
                {dejaAcces.has(m.id)
                  ? <span className="badge badge-ok">A déjà accès</span>
                  : <button type="button" className="btn btn-primary btn-inline" disabled={busy} onClick={() => run(setMembreApplication(token, m.id, app.code, true), `Accès à ${app.nom} accordé.`)}>Accorder l'accès</button>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="card-title">Membres ayant accès à {app.nom} ({(membres.data ?? []).length})</h2>
        {membres.error && <p className="banner banner-error">{membres.error}</p>}
        {!membres.loading && (membres.data ?? []).length === 0 && <p className="muted">Aucun membre n'a encore accès à cette application.</p>}
        <ul className="list">
          {(membres.data ?? []).map((m) => (
            <li key={m.membre_id} className="list-row" style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "stretch" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ flex: 1 }}><strong>{nomDe(m)}</strong> <span className="muted small">{m.matricule}</span></span>
                <button type="button" className="btn btn-ghost btn-inline" onClick={() => setOuvert(ouvert === m.membre_id ? null : m.membre_id)}>
                  {ouvert === m.membre_id ? "Masquer les droits" : "Étape 2 - Droits (groupes)"}
                </button>
                <button type="button" className="btn btn-danger btn-inline" disabled={busy} onClick={() => run(setMembreApplication(token, m.membre_id, app.code, false), `Accès à ${app.nom} révoqué.`)}>
                  Révoquer l'accès
                </button>
              </div>
              {ouvert === m.membre_id && <MembreGroupes token={token} membreId={m.membre_id} code={app.code} />}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function MembreGroupes({ token, membreId, code }: { token: string; membreId: string; code: string }): JSX.Element {
  const mg = useResource(() => getGroupesMembreApplication(token, membreId, code), [token, membreId, code]);
  const catalogue = useResource(() => getGroupes(token), [token]);
  const [groupeId, setGroupeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function run(p: Promise<unknown>): void {
    setBusy(true); setError(null);
    p.then(() => mg.reload())
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "Erreur réseau"))
      .finally(() => setBusy(false));
  }

  const groupes = (catalogue.data ?? []).filter((g: GroupeAcces) => g.actif);
  const assignes = mg.data ?? [];
  const dejaId = new Set(assignes.map((a) => a.groupe_id));

  return (
    <div style={{ background: "var(--adsum-panel)", border: "1px solid var(--adsum-line)", borderRadius: 10, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
      <span className="muted small">
        Droits via les groupes (créés dans « Accès &amp; groupes », sélectionnés ici). Attention : un groupe accorde son
        rôle ou ses permissions sur TOUTE la plateforme (portée globale) ; le rattachement à cette application sert à
        ouvrir sa connexion et à retirer ces groupes automatiquement quand l'accès est révoqué.
      </span>
      {error && <p className="banner banner-error">{error}</p>}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {assignes.length === 0 && <span className="muted small">Aucun groupe. Le membre voit l'application mais ne peut pas encore s'y connecter.</span>}
        {assignes.map((a) => (
          <span key={a.membre_groupe_id} className={`badge ${a.groupe_actif === false ? "badge-warn" : "badge-mut"}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            title={a.groupe_actif === false ? "Groupe désactivé : n'accorde plus rien et n'ouvre plus la connexion." : `Rôle accordé (global) : ${roleLabel(a.role_accorde)}`}>
            {a.libelle}{a.groupe_actif === false ? " (désactivé)" : ""}
            <button type="button" aria-label="Retirer" disabled={busy} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 13, lineHeight: 1 }}
              onClick={() => run(setGroupeMembreApplication(token, membreId, code, a.groupe_id, false))}>×</button>
          </span>
        ))}
      </div>
      <div className="toolbar">
        <select className="search" value={groupeId} onChange={(e) => setGroupeId(e.target.value)}>
          <option value="">- choisir un groupe -</option>
          {groupes.filter((g) => !dejaId.has(g.id)).map((g) => (
            <option key={g.id} value={g.id}>
              {g.libelle} ({g.mode === "permissions" ? `${g.permissions.length} permission${g.permissions.length > 1 ? "s" : ""}` : `rôle global : ${roleLabel(g.role_accorde)}`})
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-primary btn-inline" disabled={busy || !groupeId}
          onClick={() => { run(setGroupeMembreApplication(token, membreId, code, groupeId, true)); setGroupeId(""); }}>
          Ajouter au groupe
        </button>
      </div>
      <span className="muted small">Le périmètre fin (coordination, intendance, commission) se règle dans « Accès &amp; groupes ».</span>
    </div>
  );
}
