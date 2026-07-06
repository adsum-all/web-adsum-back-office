import { useState } from "react";

import { ApiError, type MembreProfile, getMembres } from "../api.js";
import { type CibleMembre } from "./utilisateursShared.js";

export function RechercheMembre({
  token,
  onChoisir,
}: {
  token: string;
  onChoisir: (m: CibleMembre) => void;
}): JSX.Element {
  const [q, setQ] = useState("");
  const [resultats, setResultats] = useState<MembreProfile[]>([]);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function chercher(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (q.trim().length < 2) {
      setErreur("Saisir au moins deux caractères.");
      return;
    }
    setBusy(true);
    setErreur(null);
    try {
      const rows = await getMembres(token, { q: q.trim(), limit: 10 });
      setResultats(rows);
      if (rows.length === 0) setErreur("Aucun membre trouvé.");
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="form-card">
      <h2 className="section-title">Accorder un accès à un membre</h2>
      <p className="muted small">
        Rechercher un membre par nom ou matricule, puis l&apos;ajouter au groupe correspondant à l&apos;accès voulu.
      </p>
      <form className="form-inline" onSubmit={chercher}>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nom, prénom ou matricule"
        />
        <button type="submit" className="btn btn-primary btn-inline" disabled={busy}>
          {busy ? "Recherche..." : "Rechercher"}
        </button>
      </form>
      {erreur && <p className="banner banner-error">{erreur}</p>}
      {resultats.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Membre</th>
                <th>Matricule</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {resultats.map((m) => (
                <tr key={m.id}>
                  <td>
                    <strong>{m.nom_affiche ?? m.nom_affichage ?? `${m.nom ?? ""} ${m.prenoms ?? ""}`.trim()}</strong>
                  </td>
                  <td className="muted small">{m.matricule}</td>
                  <td>
                    <button
                      type="button"
                      className="link"
                      onClick={() =>
                        onChoisir({
                          id: m.id,
                          nom: m.nom_affiche ?? m.nom_affichage ?? `${m.nom ?? ""} ${m.prenoms ?? ""}`.trim(),
                        })
                      }
                    >
                      Gérer les groupes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
