import { useEffect, useState } from "react";

import {
  type AuditEntry,
  type BotConfigure,
  type CanalStatut,
  type CollabCompte,
  type CollabEspace,
  type CollabStats,
  type BotDemande,
  type BotDemandes,
  type BotsConfigures,
  type Corbeille,
  type Emetteurs,
  type ReglagesCollab,
  type ReglagesCollabPatch,
  accepterDemandeEspace,
  addEspaceMembre,
  ajouterEmetteur,
  configurerBotEspace,
  dissocierBotEspace,
  getAudit,
  getBotDemandes,
  getBotsConfigures,
  getCanauxStatut,
  getCollabStats,
  getCorbeille,
  getEmetteurs,
  getReglagesCollab,
  listCollabComptes,
  listCollabEspaces,
  putReglagesCollab,
  refuserDemandeEspace,
  removeEspaceMembre,
  restaurerEspace,
  restaurerTableau,
  retirerEmetteur,
  updateEspaceMembreRole,
} from "../api.js";
import { useResource } from "../useResource.js";
import { Tabs } from "./Tabs.js";

const ONGLETS = [
  { id: "espaces", label: "Espaces de travail" },
  { id: "acces", label: "Accès et rôles" },
  { id: "canal", label: "Canal et instructions" },
  { id: "bots", label: "Bots et Telegram" },
  { id: "tableaux", label: "Tableaux et intégrations" },
  { id: "archivage", label: "Archivage et suppressions" },
  { id: "audit", label: "Audit et qualité" },
];
const ESPACE_ROLES = ["proprietaire", "admin", "membre", "observateur"];

// Read-only supervision of the collaboration spaces for an administrator: which
// account belongs to which space, with which space role, plus pending access
// requests. The actual membership management (add, change role, accept request)
// stays in the collaboration application, governed per space by its owners; this
// screen only answers "who can see and do what, and where" from the back office.

const ROLE_LABELS: Record<string, string> = {
  proprietaire: "Proprietaire",
  admin: "Administrateur",
  membre: "Membre",
  observateur: "Observateur",
};
const ROLE_ORDRE = ["proprietaire", "admin", "membre", "observateur"];

export function EspacesCollab({ token, canSysteme = false }: { token: string; canSysteme?: boolean }): JSX.Element {
  const [onglet, setOnglet] = useState("espaces");
  const espaces = useResource(() => listCollabEspaces(token), [token]);
  const comptes = useResource<CollabCompte[]>(() => listCollabComptes(token), [token]);

  if (espaces.loading || comptes.loading) {
    return (
      <section className="panel">
        <p>Chargement des espaces de collaboration...</p>
      </section>
    );
  }
  if (espaces.error) {
    return (
      <section className="panel">
        <p style={{ color: "var(--danger, #c0392b)" }}>{espaces.error}</p>
      </section>
    );
  }

  const nomPar = new Map<string, string>((comptes.data ?? []).map((c) => [c.id, c.nom]));
  const nom = (id: string): string => nomPar.get(id) ?? id;
  const liste = [...(espaces.data ?? [])].sort((a, b) => Number(a.archive) - Number(b.archive) || a.nom.localeCompare(b.nom));
  const collaborateurs = new Set<string>();
  liste.forEach((e) => e.membres.forEach((m) => collaborateurs.add(m.membre_id)));
  const demandesEnAttente = liste.reduce((n, e) => n + e.demandes_acces.length, 0);
  const sousEspacesTotal = liste.reduce((n, e) => n + (e.sous_espaces?.length ?? 0), 0);

  return (
    <section className="panel">
      <header style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Espaces collaboration</h2>
        <p className="muted" style={{ marginTop: 4 }}>
          Un seul endroit pour la collaboration et le canal d'instructions : supervision des espaces et de leurs
          accès, réglages du canal, et gestion des bots Telegram dédiés (un par espace de travail général).
        </p>
      </header>

      <Tabs tabs={ONGLETS} active={onglet} onChange={setOnglet} />

      {onglet === "espaces" && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 20 }}>
            <Kpi valeur={liste.length} libelle="espaces" />
            <Kpi valeur={sousEspacesTotal} libelle="sous-espaces" />
            <Kpi valeur={collaborateurs.size} libelle="collaborateurs distincts" />
            <Kpi valeur={demandesEnAttente} libelle="demandes en attente" />
          </div>
          <p className="muted small" style={{ margin: "0 0 12px" }}>
            Supervision en lecture seule : qui a accès à quel espace, avec quel rôle. L'ajout de membres et le
            changement de rôle se font dans l'application de collaboration, par les responsables de chaque espace.
          </p>
          {liste.length === 0 && <p className="muted">Aucun espace de collaboration pour l'instant.</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {liste.map((espace) => (
              <EspaceCarte key={espace.id} espace={espace} nom={nom} />
            ))}
          </div>
        </div>
      )}

      {onglet === "acces" && (
        <div style={{ marginTop: 16 }}>
          <AccesRolesPanel token={token} espaces={liste} comptes={comptes.data ?? []} onChanged={() => espaces.reload?.()} />
        </div>
      )}

      {onglet === "canal" && (
        <div style={{ marginTop: 16 }}>
          <ReglagesCollabPanel token={token} />
        </div>
      )}

      {onglet === "tableaux" && (
        <div style={{ marginTop: 16 }}>
          <TableauxIntegrationsPanel token={token} espaces={liste} />
        </div>
      )}

      {onglet === "bots" && (
        <div style={{ marginTop: 16 }}>
          {!canSysteme && (
            <p className="banner banner-info small">
              Configuration et dissociation des bots en lecture seule. Ces actions requièrent la permission
              <span className="mono"> acces.systeme</span>.
            </p>
          )}
          <BotDemandesPanel token={token} canSysteme={canSysteme} />
          <BotsConfiguresPanel token={token} comptes={comptes.data ?? []} canSysteme={canSysteme} />
          <BotFatherAide />
        </div>
      )}

      {onglet === "archivage" && (
        <div style={{ marginTop: 16 }}>
          <CorbeillePanel token={token} nomEspace={(id) => liste.find((e) => e.id === id)?.nom ?? id} />
        </div>
      )}

      {onglet === "audit" && (
        <div style={{ marginTop: 16 }}>
          <AuditQualitePanel token={token} espaces={liste} collaborateurs={collaborateurs.size} demandes={demandesEnAttente} />
        </div>
      )}
    </section>
  );
}

function AccesRolesPanel({ token, espaces, comptes, onChanged }: { token: string; espaces: CollabEspace[]; comptes: CollabCompte[]; onChanged: () => void }): JSX.Element {
  const [locaux, setLocaux] = useState<CollabEspace[]>(espaces);
  const [sel, setSel] = useState<string>(espaces[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [choix, setChoix] = useState("");
  useEffect(() => { setLocaux(espaces); }, [espaces]);
  const nomPar = new Map(comptes.map((c) => [c.id, c.nom]));
  const nom = (id: string): string => nomPar.get(id) ?? id;
  const espace = locaux.find((e) => e.id === sel) ?? null;
  function maj(e: CollabEspace): void { setLocaux((l) => l.map((x) => (x.id === e.id ? e : x))); onChanged(); }
  async function run(p: Promise<CollabEspace>): Promise<void> {
    setBusy(true); setErr(null);
    try { maj(await p); } catch (e) { setErr(e instanceof Error ? e.message : "Erreur"); } finally { setBusy(false); }
  }
  if (espaces.length === 0) return <p className="muted">Aucun espace.</p>;
  const dejaIds = new Set((espace?.membres ?? []).map((m) => m.membre_id));
  const dispo = comptes.filter((c) => !dejaIds.has(c.id));
  return (
    <section className="card">
      <h2 className="card-title" style={{ fontSize: 15 }}>Accès et rôles par espace</h2>
      <p className="muted small" style={{ margin: "0 0 10px" }}>
        Gestion effective des membres d'un espace : ajout, changement de rôle, retrait, et traitement des demandes
        d'accès. Les contrôles sont appliqués côté serveur (rôle d'espace requis).
      </p>
      <label style={{ display: "block", marginBottom: 12 }}>
        <span className="muted small">Espace</span><br />
        <select className="search" style={{ maxWidth: 360 }} value={sel} onChange={(e) => setSel(e.target.value)}>
          {locaux.map((e) => <option key={e.id} value={e.id}>{e.nom}{e.parent_id ? " (sous-espace)" : ""}</option>)}
        </select>
      </label>
      {err && <p className="banner banner-error small" style={{ margin: "0 0 8px" }}>{err}</p>}
      {espace && (
        <>
          {(espace.demandes_acces?.length ?? 0) > 0 && (
            <div style={{ marginBottom: 12 }}>
              <strong className="small">Demandes d'accès en attente</strong>
              {espace.demandes_acces.map((d) => (
                <div key={d.id} className="list-row" style={{ gap: 8, alignItems: "center" }}>
                  <span style={{ flex: 1 }}>{nom(d.membre_id)}</span>
                  <button type="button" className="btn btn-primary btn-inline" disabled={busy}
                    onClick={() => void run(accepterDemandeEspace(token, espace.id, d.id, "membre"))}>Accepter (membre)</button>
                  <button type="button" className="btn btn-ghost btn-inline" disabled={busy}
                    onClick={() => void run(refuserDemandeEspace(token, espace.id, d.id))}>Refuser</button>
                </div>
              ))}
            </div>
          )}
          <strong className="small">Membres ({espace.membres.length})</strong>
          {espace.membres.length === 0 && <p className="muted small">Aucun membre.</p>}
          {espace.membres.map((m) => (
            <div key={m.membre_id} className="list-row" style={{ gap: 8, alignItems: "center" }}>
              <span style={{ flex: 1 }}>{nom(m.membre_id)}</span>
              <select className="search" style={{ maxWidth: 160 }} value={m.role} disabled={busy}
                onChange={(e) => void run(updateEspaceMembreRole(token, espace.id, m.membre_id, e.target.value))}>
                {ESPACE_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <button type="button" className="btn btn-ghost btn-inline" disabled={busy}
                onClick={() => void run(removeEspaceMembre(token, espace.id, m.membre_id))}>Retirer</button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
            <select className="search" style={{ maxWidth: 220 }} value={choix} disabled={busy} onChange={(e) => setChoix(e.target.value)}>
              <option value="">Ajouter un membre...</option>
              {dispo.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
            <button type="button" className="btn btn-primary btn-inline" disabled={busy || !choix}
              onClick={() => { if (choix) { void run(addEspaceMembre(token, espace.id, choix, "membre")); setChoix(""); } }}>Ajouter (membre)</button>
          </div>
        </>
      )}
    </section>
  );
}

function TableauxIntegrationsPanel({ token, espaces }: { token: string; espaces: CollabEspace[] }): JSX.Element {
  const [stats, setStats] = useState<CollabStats | null>(null);
  const [canaux, setCanaux] = useState<Record<string, CanalStatut> | null>(null);
  useEffect(() => {
    void getCollabStats(token).then(setStats).catch(() => undefined);
    void getCanauxStatut(token).then(setCanaux).catch(() => undefined);
  }, [token]);
  return (
    <>
      <section className="card" style={{ marginBottom: 16 }}>
        <h2 className="card-title" style={{ fontSize: 15 }}>Tableaux (vue d'ensemble)</h2>
        {!stats ? <p className="muted small">Chargement...</p> : (
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <Kpi valeur={stats.espaces} libelle="espaces" />
            <Kpi valeur={stats.tableaux} libelle="tableaux" />
            <Kpi valeur={stats.cartes} libelle="cartes" />
            <Kpi valeur={stats.enRetard} libelle="cartes en retard" />
            <Kpi valeur={stats.termineesSemaine} libelle="terminées (7 j)" />
          </div>
        )}
        <p className="muted small" style={{ marginTop: 10 }}>
          Le détail des tableaux et la colonne « Instructions du canal » se gèrent dans l'application collaboration, par
          espace. Cette vue supervise les volumes ({espaces.length} espace(s) visibles).
        </p>
      </section>
      <section className="card">
        <h2 className="card-title" style={{ fontSize: 15 }}>Intégrations</h2>
        {!canaux ? <p className="muted small">Chargement...</p> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {Object.entries(canaux).map(([nom, c]) => (
              <div key={nom} className="list-row" style={{ gap: 8, alignItems: "center" }}>
                <span style={{ flex: 1, textTransform: "capitalize" }}>{nom}{c.provider ? ` · ${c.provider}` : ""}</span>
                <span className={`badge ${c.actif ? "badge-ok" : "badge-mut"}`}>{c.actif ? "actif" : "inactif"}</span>
                {c.gratuit && <span className="badge badge-mut">gratuit</span>}
                {c.note && <span className="muted small">{c.note}</span>}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

const ACTIONS_COLLAB = "collab_";
function AuditQualitePanel({ token, espaces, collaborateurs, demandes }: { token: string; espaces: CollabEspace[]; collaborateurs: number; demandes: number }): JSX.Element {
  const [audit, setAudit] = useState<AuditEntry[] | null>(null);
  useEffect(() => { void getAudit(token).then(setAudit).catch(() => setAudit([])); }, [token]);
  const collab = (audit ?? []).filter((a) => (a.objet_type ?? "").startsWith("collab") || a.action.startsWith(ACTIONS_COLLAB) || a.action.includes("canal") || a.action.includes("espace"));
  return (
    <>
      <section className="card" style={{ marginBottom: 16 }}>
        <h2 className="card-title" style={{ fontSize: 15 }}>Qualité et santé</h2>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <Kpi valeur={espaces.length} libelle="espaces actifs" />
          <Kpi valeur={collaborateurs} libelle="collaborateurs" />
          <Kpi valeur={demandes} libelle="demandes en attente" />
          <Kpi valeur={collab.length} libelle="actions collab récentes" />
        </div>
      </section>
      <section className="card">
        <h2 className="card-title" style={{ fontSize: 15 }}>Journal d'audit (collaboration)</h2>
        {!audit ? <p className="muted small">Chargement...</p> : collab.length === 0 ? (
          <p className="muted small">Aucune action de collaboration récente dans le journal.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {collab.slice(0, 40).map((a) => (
              <div key={a.id} className="list-row" style={{ gap: 8, alignItems: "center", fontSize: 13 }}>
                <span className="badge badge-mut">{a.action}</span>
                <span style={{ flex: 1 }}>{a.objet_type ?? ""}</span>
                <span className="muted small">{a.acteur_nom ?? a.acteur_role ?? ""}</span>
                <span className="muted small">{a.horodatage ? new Date(a.horodatage).toLocaleString("fr-FR") : ""}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function CorbeillePanel({ token, nomEspace }: { token: string; nomEspace: (id: string) => string }): JSX.Element {
  const [data, setData] = useState<Corbeille | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const reload = (): void => { void getCorbeille(token).then(setData).catch(() => setData({ retention_jours: 0, espaces: [], tableaux: [] })); };
  useEffect(reload, [token]);
  if (!data) return <></>;
  async function restaurer(kind: "espace" | "tableau", id: string): Promise<void> {
    setBusy(id); setMsg(null);
    try {
      if (kind === "espace") await restaurerEspace(token, id); else await restaurerTableau(token, id);
      setMsg("Élément restauré.");
      reload();
    } catch (e) { setMsg(e instanceof Error ? e.message : "Erreur"); }
    finally { setBusy(null); }
  }
  const vide = data.espaces.length === 0 && data.tableaux.length === 0;
  return (
    <section className="card">
      <h2 className="card-title" style={{ fontSize: 15 }}>Corbeille</h2>
      <p className="muted small" style={{ margin: "0 0 10px" }}>
        Les éléments supprimés restent récupérables pendant <strong>{data.retention_jours} jour(s)</strong> (délai réglable
        dans l'onglet « Canal et instructions »), puis sont purgés définitivement (avec effacement des fichiers liés, RGPD).
        Un délai de 0 supprime immédiatement.
      </p>
      {msg && <p className="banner banner-ok small" style={{ margin: "0 0 8px" }}>{msg}</p>}
      {vide && <p className="muted small">La corbeille est vide.</p>}
      {data.espaces.map((e) => (
        <div key={e.id} className="list-row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <strong>{e.nom}</strong>{" "}
            <span className="badge badge-mut">{e.sous_espace ? "sous-espace" : "espace"}</span>{" "}
            <span className="muted small">purge dans {e.jours_restants} j</span>
          </div>
          <button type="button" className="btn btn-ghost btn-inline" disabled={busy === e.id} onClick={() => void restaurer("espace", e.id)}>
            {busy === e.id ? "..." : "Restaurer"}
          </button>
        </div>
      ))}
      {data.tableaux.map((t) => (
        <div key={t.id} className="list-row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <strong>{t.nom}</strong>{" "}
            <span className="badge badge-mut">tableau</span>{" "}
            <span className="muted small">dans « {nomEspace(t.espace_id ?? "")} » · purge dans {t.jours_restants} j</span>
          </div>
          <button type="button" className="btn btn-ghost btn-inline" disabled={busy === t.id} onClick={() => void restaurer("tableau", t.id)}>
            {busy === t.id ? "..." : "Restaurer"}
          </button>
        </div>
      ))}
    </section>
  );
}

export function ReglagesCollabPanel({ token }: { token: string }): JSX.Element {
  const [r, setR] = useState<ReglagesCollab | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { void getReglagesCollab(token).then(setR).catch(() => undefined); }, [token]);
  async function save(patch: ReglagesCollabPatch): Promise<void> {
    setBusy(true); setMsg(null);
    try { setR(await putReglagesCollab(token, patch)); setMsg("Enregistré."); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Erreur"); }
    finally { setBusy(false); }
  }
  if (!r) return <></>;
  return (
    <section className="card" style={{ marginBottom: 16 }}>
      <h2 className="card-title" style={{ fontSize: 15 }}>Réglages collaboration</h2>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="muted small">Rétention avant suppression définitive (0 à 90 jours, 0 = immédiat)</span>
          <input type="number" min={0} max={90} className="search" style={{ maxWidth: 120 }} disabled={busy}
            value={r.retention_suppression_jours}
            onChange={(e) => setR({ ...r, retention_suppression_jours: Number(e.target.value) })}
            onBlur={(e) => { const n = Math.max(0, Math.min(90, Number(e.target.value))); void save({ retention_suppression_jours: n }); }} />
        </label>
        <label className="check" style={{ alignItems: "center" }}>
          <input type="checkbox" checked={r.colonne_instructions_auto} disabled={busy}
            onChange={(e) => void save({ colonne_instructions_auto: e.target.checked })} />
          {" "}Colonne « Instructions du canal » automatique sur chaque nouveau tableau
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="muted small">Émetteurs autorisés max par canal</span>
          <input type="number" min={1} max={50} className="search" style={{ maxWidth: 100 }} disabled={busy}
            value={r.canal_emetteurs_max}
            onChange={(e) => setR({ ...r, canal_emetteurs_max: Number(e.target.value) })}
            onBlur={(e) => void save({ canal_emetteurs_max: Math.max(1, Math.min(50, Number(e.target.value))) })} />
        </label>
        <label className="check" style={{ alignItems: "center" }}>
          <input type="checkbox" checked={r.canaux_additionnels_actives} disabled={busy}
            onChange={(e) => void save({ canaux_additionnels_actives: e.target.checked })} />
          {" "}Activer les canaux d'instruction additionnels (désactivé par défaut)
        </label>
      </div>
      {msg && <p className="muted small" style={{ marginTop: 6 }}>{msg}</p>}
    </section>
  );
}

export function BotDemandesPanel({ token, canSysteme = false }: { token: string; canSysteme?: boolean }): JSX.Element {
  const [data, setData] = useState<BotDemandes | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const reload = (): void => { void getBotDemandes(token).then(setData).catch(() => setData({ etapes: [], espaces: [] })); };
  useEffect(reload, [token]);
  if (!data) return <></>;
  return (
    <section className="card" style={{ marginBottom: 16 }}>
      <h2 className="card-title" style={{ fontSize: 15 }}>Demandes de configuration des bots d'instruction</h2>
      <p className="muted small" style={{ margin: "0 0 8px" }}>
        Chaque espace de travail général a son propre bot d'instruction, distinct du bot des membres. Créez un bot dédié
        dans @BotFather puis collez son identifiant et son token ci-dessous pour l'activer.
      </p>
      {data.etapes.length > 0 && (
        <ol className="muted small" style={{ margin: "0 0 10px 18px", padding: 0 }}>
          {data.etapes.map((e, i) => <li key={i} style={{ marginBottom: 2 }}>{e}</li>)}
        </ol>
      )}
      {data.espaces.length === 0 ? (
        <p className="muted small">Aucun espace en attente de configuration.</p>
      ) : (
        data.espaces.map((e) => <BotDemandeRow key={e.id} token={token} espace={e} canSysteme={canSysteme} onDone={() => { reload(); setMsg(`Bot de « ${e.nom} » configuré.`); }} />)
      )}
      {msg && <p className="banner banner-ok small" style={{ marginTop: 6 }}>{msg}</p>}
    </section>
  );
}

function BotDemandeRow({ token, espace, canSysteme = false, onDone }: { token: string; espace: BotDemande; canSysteme?: boolean; onDone: () => void }): JSX.Element {
  const [username, setUsername] = useState(espace.username ?? "");
  const [tok, setTok] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function save(): Promise<void> {
    setBusy(true); setErr(null);
    try { await configurerBotEspace(token, espace.id, username.trim(), tok.trim()); setTok(""); onDone(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Erreur"); }
    finally { setBusy(false); }
  }
  return (
    <div className="list-row" style={{ flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
      <div style={{ minWidth: 180 }}>
        <strong>{espace.nom}</strong>{" "}
        <span className={`badge ${espace.statut === "demande" ? "badge-warn" : "badge-mut"}`}>
          {espace.statut === "demande" ? "Configuration demandée" : "Non configuré"}
        </span>
      </div>
      {canSysteme ? (
        <>
          <input className="search" style={{ maxWidth: 200 }} placeholder="username du bot (sans @)" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input type="password" className="search" style={{ maxWidth: 240 }} placeholder="token BotFather (123:ABC...)" value={tok} onChange={(e) => setTok(e.target.value)} />
          <button type="button" className="btn btn-primary btn-inline" disabled={busy || !username.trim() || !tok.trim()} onClick={() => void save()}>Configurer</button>
          {err && <span className="muted small" style={{ color: "var(--adsum-danger)" }}>{err}</span>}
        </>
      ) : (
        <span className="muted small">Lecture seule</span>
      )}
    </div>
  );
}

export function BotsConfiguresPanel({ token, comptes, canSysteme = false }: { token: string; comptes: CollabCompte[]; canSysteme?: boolean }): JSX.Element {
  const [data, setData] = useState<BotsConfigures | null>(null);
  const reload = (): void => { void getBotsConfigures(token).then(setData).catch(() => setData({ bots: [] })); };
  useEffect(reload, [token]);
  if (!data) return <></>;
  return (
    <section className="card" style={{ marginBottom: 16 }}>
      <h2 className="card-title" style={{ fontSize: 15 }}>Bots d'instruction configurés</h2>
      <p className="muted small" style={{ margin: "0 0 8px" }}>
        Une note vocale n'est acceptée que si son expéditeur est un <strong>émetteur autorisé</strong> de l'espace.
        Sans émetteur autorisé, les notes reçues par le bot sont refusées (rien ne remonte). Dissocier un bot désactive
        son lien, son QR et la remontée ; le bot Telegram n'est pas supprimé (utilisez /deletebot dans @BotFather).
      </p>
      {data.bots.length === 0 ? (
        <p className="muted small">Aucun bot d'instruction configuré pour l'instant.</p>
      ) : (
        data.bots.map((b) => <BotConfigureRow key={b.espace_id} token={token} bot={b} comptes={comptes} canSysteme={canSysteme} onChanged={reload} />)
      )}
    </section>
  );
}

function BotConfigureRow({ token, bot, comptes, canSysteme = false, onChanged }: { token: string; bot: BotConfigure; comptes: CollabCompte[]; canSysteme?: boolean; onChanged: () => void }): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [confirme, setConfirme] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function dissocier(): Promise<void> {
    setBusy(true); setMsg(null);
    try {
      const r = await dissocierBotEspace(token, bot.espace_id);
      setMsg(r.message);
      onChanged();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false); setConfirme(false);
    }
  }
  return (
    <div style={{ borderBottom: "1px solid var(--adsum-line)", padding: "12px 0" }}>
      <div className="list-row" style={{ flexWrap: "wrap", gap: 8, alignItems: "center", border: "none", padding: 0, background: "none" }}>
        <div style={{ minWidth: 200, flex: 1 }}>
          <strong>{bot.nom}</strong>{" "}
          {bot.username && <span className="badge badge-ok">@{bot.username}</span>}
        </div>
        {!canSysteme ? (
          <span className="muted small">Lecture seule</span>
        ) : !confirme ? (
          <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => setConfirme(true)}>
            Dissocier le bot
          </button>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span className="muted small">Confirmer la dissociation ?</span>
            <button type="button" className="btn btn-danger btn-inline" disabled={busy} onClick={() => void dissocier()}>
              {busy ? "Dissociation..." : "Oui, dissocier"}
            </button>
            <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => setConfirme(false)}>
              Annuler
            </button>
          </div>
        )}
        {msg && <span className="muted small" style={{ flexBasis: "100%" }}>{msg}</span>}
      </div>
      <div className="muted small" style={{ marginTop: 6, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <span>Dernière synchro : {bot.derniere_synchro ? new Date(bot.derniere_synchro).toLocaleString("fr-FR") : "jamais"}</span>
        <span>Dernière note : {bot.derniere_note ? new Date(bot.derniere_note).toLocaleString("fr-FR") : "aucune"}</span>
        {bot.dernier_echec && (
          <span style={{ color: "var(--adsum-danger)" }}>Dernier échec : {bot.dernier_echec}{bot.dernier_echec_le ? ` (${new Date(bot.dernier_echec_le).toLocaleString("fr-FR")})` : ""}</span>
        )}
      </div>
      <EmetteursManager token={token} espaceId={bot.espace_id} comptes={comptes} />
    </div>
  );
}

function EmetteursManager({ token, espaceId, comptes }: { token: string; espaceId: string; comptes: CollabCompte[] }): JSX.Element {
  const [data, setData] = useState<Emetteurs | null>(null);
  const [choix, setChoix] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const reload = (): void => { void getEmetteurs(token, espaceId).then(setData).catch(() => setData({ max: 1, emetteurs: [] })); };
  useEffect(reload, [token, espaceId]);
  if (!data) return <></>;
  const dejaIds = new Set(data.emetteurs.map((e) => e.utilisateur_id));
  const dispo = comptes.filter((c) => !dejaIds.has(c.id));
  const plein = data.emetteurs.length >= data.max;
  async function ajouter(): Promise<void> {
    if (!choix) return;
    setBusy(true); setErr(null);
    try { setData(await ajouterEmetteur(token, espaceId, choix)); setChoix(""); }
    catch (e) { setErr(e instanceof Error ? e.message : "Erreur"); }
    finally { setBusy(false); }
  }
  async function retirer(uid: string): Promise<void> {
    setBusy(true); setErr(null);
    try { setData(await retirerEmetteur(token, espaceId, uid)); }
    catch (e) { setErr(e instanceof Error ? e.message : "Erreur"); }
    finally { setBusy(false); }
  }
  return (
    <div style={{ marginTop: 8, paddingLeft: 4 }}>
      <span className="muted small">Émetteurs autorisés ({data.emetteurs.length}/{data.max})</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginTop: 4 }}>
        {data.emetteurs.length === 0 && <span className="muted small">Aucun. Le bot refuse toutes les notes tant qu'aucun émetteur n'est autorisé.</span>}
        {data.emetteurs.map((e) => (
          <span key={e.utilisateur_id} className="badge badge-mut" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            {e.nom}
            <button type="button" aria-label={`Retirer ${e.nom}`} disabled={busy} onClick={() => void retirer(e.utilisateur_id)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0 }}>✕</button>
          </span>
        ))}
        {!plein && (
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <select className="search" style={{ maxWidth: 220 }} value={choix} disabled={busy} onChange={(e) => setChoix(e.target.value)}>
              <option value="">Ajouter un émetteur...</option>
              {dispo.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
            <button type="button" className="btn btn-ghost btn-inline" disabled={busy || !choix} onClick={() => void ajouter()}>Autoriser</button>
          </span>
        )}
        {plein && <span className="muted small">Limite atteinte (réglable dans l'onglet « Canal et instructions »).</span>}
      </div>
      {err && <span className="muted small" style={{ color: "var(--adsum-danger)" }}>{err}</span>}
    </div>
  );
}

function BotFatherAide(): JSX.Element {
  return (
    <section className="card" style={{ marginTop: 8 }}>
      <h3 className="card-title" style={{ fontSize: 14 }}>Aide : créer un bot d'instruction dans BotFather</h3>
      <ol className="muted small" style={{ margin: "6px 0 0 18px", padding: 0 }}>
        <li>Ouvrir Telegram, démarrer une conversation avec @BotFather.</li>
        <li>Envoyer /newbot, choisir un nom lisible (ex : « ADSUM Instructions - Comité de direction »).</li>
        <li>Choisir un identifiant unique finissant par « bot » (ex : adsum_instr_direction_bot).</li>
        <li>Copier le token renvoyé (format 123456:ABC-...).</li>
        <li>Coller l'identifiant et le token dans la demande correspondante ci-dessus, puis « Configurer ».</li>
        <li>L'émetteur autorisé scanne alors le QR de l'espace d'instruction (dans l'application collaboration).</li>
      </ol>
    </section>
  );
}

function Kpi({ valeur, libelle }: { valeur: number; libelle: string }): JSX.Element {
  return (
    <div>
      <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{valeur}</div>
      <div className="muted" style={{ fontSize: 13 }}>{libelle}</div>
    </div>
  );
}

function EspaceCarte({ espace, nom }: { espace: CollabEspace; nom: (id: string) => string }): JSX.Element {
  return (
    <article
      style={{
        border: "1px solid var(--border, #e2e2e2)",
        borderRadius: 10,
        padding: "14px 16px",
        opacity: espace.archive ? 0.6 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span
          aria-hidden
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 8,
            background: espace.couleur || "#4b5563",
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {espace.initiale}
        </span>
        <strong>{espace.nom}</strong>
        <span className="muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4 }}>{espace.type}</span>
        {espace.archive && <span className="muted" style={{ fontSize: 12 }}>(archive)</span>}
      </div>

      {espace.description && (
        <p className="muted" style={{ margin: "8px 0 0" }}>{espace.description}</p>
      )}

      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
        {ROLE_ORDRE.map((role) => {
          const membres = espace.membres.filter((m) => m.role === role);
          if (membres.length === 0) return null;
          return (
            <div key={role} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600, minWidth: 130 }}>{ROLE_LABELS[role] ?? role} ({membres.length})</span>
              <span className="muted">{membres.map((m) => nom(m.membre_id)).join(", ")}</span>
            </div>
          );
        })}
        {espace.membres.length === 0 && <span className="muted">Aucun membre.</span>}
      </div>

      {(espace.sous_espaces?.length ?? 0) > 0 && (
        <div style={{ marginTop: 10 }}>
          <span style={{ fontWeight: 600 }}>Sous-espaces ({espace.sous_espaces?.length})</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
            {espace.sous_espaces?.map((se) => (
              <span
                key={se.id}
                title={se.archive ? "Archive" : undefined}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  border: "1px solid var(--border, #e2e2e2)",
                  borderRadius: 999,
                  padding: "2px 10px 2px 4px",
                  opacity: se.archive ? 0.6 : 1,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    background: se.couleur || "#6b7280",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 11,
                  }}
                >
                  {se.initiale}
                </span>
                {se.nom}
              </span>
            ))}
          </div>
        </div>
      )}

      {espace.demandes_acces.length > 0 && (
        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600, minWidth: 130, color: "var(--danger, #c0392b)" }}>
            Demandes en attente ({espace.demandes_acces.length})
          </span>
          <span className="muted">{espace.demandes_acces.map((d) => nom(d.membre_id)).join(", ")}</span>
        </div>
      )}
    </article>
  );
}
