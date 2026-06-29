import { useState } from "react";

import { ApiError, type Terminal, createTerminal, getTerminaux, updateTerminal } from "../api.js";
import { formatDate } from "../format.js";
import { useResource } from "../useResource.js";

export function Terminaux({ token }: { token: string }): JSX.Element {
  const terminaux = useResource(() => getTerminaux(token), [token]);
  const [nom, setNom] = useState("");
  const [appareil, setAppareil] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function guard<T>(p: Promise<T>): void {
    setError(null);
    p.then(() => terminaux.reload()).catch((e: unknown) =>
      setError(e instanceof ApiError ? e.message : "Erreur reseau"),
    );
  }

  async function register(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!nom.trim() || !appareil.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createTerminal(token, { nom: nom.trim(), appareil_id: appareil.trim() });
      setNom("");
      setAppareil("");
      terminaux.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur reseau");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Terminaux de scan</h1>
          <p className="muted">Seuls les terminaux autorises pointent. Un appareil perdu est revoque a distance.</p>
        </div>
      </header>

      <form className="toolbar" onSubmit={register}>
        <input className="search" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom (Entree A, Tablette accueil...)" />
        <input className="search" value={appareil} onChange={(e) => setAppareil(e.target.value)} placeholder="Identifiant appareil (TRM-01)" />
        <button type="submit" className="btn btn-primary btn-inline" disabled={busy}>
          + Enregistrer
        </button>
      </form>
      {error && <p className="banner banner-error">{error}</p>}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Terminal</th>
              <th>Appareil</th>
              <th>Appaire le</th>
              <th>Etat</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {terminaux.loading && (
              <tr>
                <td colSpan={5} className="muted">Chargement...</td>
              </tr>
            )}
            {(terminaux.data ?? []).map((t: Terminal) => (
              <tr key={t.id}>
                <td>{t.nom ?? "-"}</td>
                <td className="mono">{t.appareil_id ?? "-"}</td>
                <td>{t.appaire_le ? formatDate(t.appaire_le) : "-"}</td>
                <td>
                  <span className={`badge ${t.autorise ? "badge-ok" : "badge-warn"}`}>
                    {t.autorise ? "autorise" : "revoque"}
                  </span>
                </td>
                <td>
                  <button type="button" className="link" onClick={() => guard(updateTerminal(token, t.id, { autorise: !t.autorise }))}>
                    {t.autorise ? "Revoquer" : "Autoriser"}
                  </button>
                </td>
              </tr>
            ))}
            {!terminaux.loading && (terminaux.data ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="muted">Aucun terminal enregistre.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
