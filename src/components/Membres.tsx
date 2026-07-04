import { useState } from "react";

import { getMembres } from "../api.js";
import { civilName } from "../format.js";
import { useResource } from "../useResource.js";
import { MembreDetail } from "./MembreDetail.js";
import { MembreForm } from "./MembreForm.js";

type View = { kind: "list" } | { kind: "create" } | { kind: "detail"; id: string };

export function Membres({ token }: { token: string }): JSX.Element {
  const [view, setView] = useState<View>({ kind: "list" });
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const membres = useResource(() => getMembres(token, { q: query || undefined, limit: 200 }), [token, query]);

  if (view.kind === "create") {
    return (
      <MembreForm
        token={token}
        onDone={() => {
          setView({ kind: "list" });
          membres.reload();
        }}
        onCancel={() => setView({ kind: "list" })}
      />
    );
  }

  if (view.kind === "detail") {
    return (
      <MembreDetail
        token={token}
        id={view.id}
        onBack={() => {
          setView({ kind: "list" });
          membres.reload();
        }}
      />
    );
  }

  const list = membres.data ?? [];

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Annuaire des membres</h1>
          <p className="muted">Recherche, creation et suivi des membres reels.</p>
        </div>
        <button type="button" className="btn btn-primary btn-inline" onClick={() => setView({ kind: "create" })}>
          + Creer un compte
        </button>
      </header>

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
          placeholder="Nom, code, telephone, courriel..."
          aria-label="Rechercher"
        />
        <button type="submit" className="btn btn-ghost btn-inline">
          Rechercher
        </button>
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
                  Aucun membre.
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
      <p className="muted small">{list.length} membre(s) affiche(s).</p>
    </div>
  );
}
