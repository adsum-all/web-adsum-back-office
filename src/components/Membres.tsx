import { useEffect, useState } from "react";

import { getMembres, getMembresCompartiments } from "../api.js";
import { civilName } from "../format.js";
import { useResource } from "../useResource.js";
import { AnnuairePanel } from "./AnnuairePanel.js";
import { MembreDetail } from "./MembreDetail.js";
import { MembreForm } from "./MembreForm.js";
import { Tabs } from "./Tabs.js";

type View = { kind: "list" } | { kind: "create" } | { kind: "detail"; id: string };

// Directory compartments: a non-validated dossier (en attente, corrections, refusés,
// incomplets) never appears among the active members. Each tab is a server-side filter,
// so isolation is enforced by the API, not by hiding rows client-side.
const COMPARTIMENTS: { id: string; label: string }[] = [
  { id: "actifs", label: "Membres actifs" },
  { id: "en_attente", label: "Dossiers en attente" },
  { id: "corrections", label: "Corrections demandées" },
  { id: "refuses", label: "Refusés" },
  { id: "incomplets", label: "Incomplets" },
  { id: "inactifs", label: "Inactifs / désactivés" },
  { id: "suspendus", label: "Suspendus" },
  { id: "archives", label: "Archivés" },
  { id: "tous", label: "Tous" },
];

// The annuaire sub-context (compartment, search, sort) is carried in the URL hash query
// (#/membres?statut=...&q=...&tri=...) so a refresh restores the exact tab, filter and
// sort instead of resetting them. App.tsx reads only the section (before "?"), so the two
// never conflict.
function readAnnuaireHash(): { statut: string; q: string; tri: string } {
  const def = { statut: "actifs", q: "", tri: "nom" };
  if (typeof window === "undefined") return def;
  const qi = window.location.hash.indexOf("?");
  if (qi < 0) return def;
  const sp = new URLSearchParams(window.location.hash.slice(qi + 1));
  return { statut: sp.get("statut") || def.statut, q: sp.get("q") || def.q, tri: sp.get("tri") || def.tri };
}
function writeAnnuaireHash(statut: string, q: string, tri: string): void {
  if (typeof window === "undefined") return;
  const base = window.location.hash.split("?")[0] || "#/membres";
  const sp = new URLSearchParams();
  if (statut && statut !== "actifs") sp.set("statut", statut);
  if (q) sp.set("q", q);
  if (tri && tri !== "nom") sp.set("tri", tri);
  const qs = sp.toString();
  const next = qs ? `${base}?${qs}` : base;
  if (window.location.hash !== next) window.location.hash = next;
}

export function Membres({ token }: { token: string }): JSX.Element {
  const initial = readAnnuaireHash();
  const [view, setView] = useState<View>({ kind: "list" });
  const [q, setQ] = useState(initial.q);
  const [query, setQuery] = useState(initial.q);
  const [compartiment, setCompartiment] = useState(initial.statut);
  const [tri, setTri] = useState(initial.tri);

  // Persist the sub-context in the URL so a browser refresh returns to the same tab,
  // filter and sort. Runs only in the list view (the hash otherwise carries a detail).
  useEffect(() => {
    if (view.kind === "list") writeAnnuaireHash(compartiment, query, tri);
  }, [view.kind, compartiment, query, tri]);
  // The directory drawer lives at the container level so it stays mounted (and keeps
  // its search, filters and scroll) while the detail below reloads on a profile switch.
  const [annuaireOpen, setAnnuaireOpen] = useState(false);
  const membres = useResource(
    () => getMembres(token, { q: query || undefined, statut: compartiment, tri, limit: 200 }),
    [token, query, compartiment, tri],
    12000,
  );
  const compteurs = useResource(() => getMembresCompartiments(token), [token], 10000);

  function reloadAll(): void {
    membres.reload();
    compteurs.reload();
  }

  if (view.kind === "create") {
    return (
      <MembreForm
        token={token}
        onDone={() => {
          setView({ kind: "list" });
          reloadAll();
        }}
        onCancel={() => setView({ kind: "list" })}
      />
    );
  }

  if (view.kind === "detail") {
    return (
      <>
        <MembreDetail
          token={token}
          id={view.id}
          onBack={() => {
            setAnnuaireOpen(false);
            setView({ kind: "list" });
            reloadAll();
          }}
          onOpenAnnuaire={() => setAnnuaireOpen(true)}
        />
        <AnnuairePanel
          token={token}
          currentId={view.id}
          open={annuaireOpen}
          onClose={() => setAnnuaireOpen(false)}
          onSelect={(nid) => setView({ kind: "detail", id: nid })}
        />
      </>
    );
  }

  const list = membres.data ?? [];
  const counts = compteurs.data ?? {};
  const tabs = COMPARTIMENTS.map((c) => ({
    id: c.id,
    label: `${c.label}${counts[c.id] !== undefined ? ` (${counts[c.id]})` : ""}`,
  }));

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Annuaire des membres</h1>
          <p className="muted">Compartimenté par statut ; tri alphabétique par nom, puis prénoms.</p>
        </div>
        <button type="button" className="btn btn-primary btn-inline" onClick={() => setView({ kind: "create" })}>
          + Creer un compte
        </button>
      </header>

      <Tabs tabs={tabs} active={compartiment} onChange={(id) => setCompartiment(id)} />

      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(q.trim());
        }}
      >
        <input
          className="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nom, prénom, code, téléphone, courriel..."
          aria-label="Rechercher"
        />
        <button type="submit" className="btn btn-ghost btn-inline">
          Rechercher
        </button>
        <label className="muted small" style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: "auto" }}>
          Trier
          <select className="search" style={{ maxWidth: 190 }} value={tri} onChange={(e) => setTri(e.target.value)}>
            <option value="nom">Nom (A-Z)</option>
            <option value="nom_desc">Nom (Z-A)</option>
            <option value="inscription">Date d'inscription</option>
            <option value="matricule">Matricule</option>
          </select>
        </label>
      </form>

      {membres.error && <p className="banner banner-error">{membres.error}</p>}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Membre</th>
              <th>Code</th>
              <th>Commission</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {membres.loading && (
              <tr>
                <td colSpan={4} className="muted">
                  Chargement...
                </td>
              </tr>
            )}
            {!membres.loading && list.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  Aucun membre dans ce compartiment.
                </td>
              </tr>
            )}
            {list.map((m) => (
              <tr key={m.id} className="row-click" onClick={() => setView({ kind: "detail", id: m.id })}>
                <td>{civilName(m, m.matricule)}</td>
                <td className="mono">{m.matricule}</td>
                <td>{m.commission ?? "-"}</td>
                <td>
                  <span className={`badge ${m.verifie ? "badge-ok" : "badge-warn"}`}>
                    {m.statut === "actif" ? (m.verifie ? "ACTIF" : "NON VER.") : m.statut.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">{list.length} membre(s) affiché(s).</p>
    </div>
  );
}
