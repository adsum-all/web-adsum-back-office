import { useState } from "react";

import { ApiError, type MembreUpdateInput, getCommissions, getMembre, updateMembre } from "../api.js";
import { fullName, initials } from "../format.js";
import { useResource } from "../useResource.js";

interface MembreDetailProps {
  token: string;
  id: string;
  onBack: () => void;
}

export function MembreDetail({ token, id, onBack }: MembreDetailProps): JSX.Element {
  const membre = useResource(() => getMembre(token, id), [token, id]);
  const commissions = useResource(() => getCommissions(token), [token]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function patch(input: MembreUpdateInput, message: string): Promise<void> {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      await updateMembre(token, id, input);
      membre.reload();
      setNote(message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur reseau");
    } finally {
      setBusy(false);
    }
  }

  if (membre.loading) return <div className="page muted">Chargement...</div>;
  if (membre.error || !membre.data) return <div className="page banner banner-error">{membre.error ?? "Introuvable"}</div>;

  const m = membre.data;
  const name = fullName(m.prenoms, m.nom, m.matricule);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <button type="button" className="link" onClick={onBack}>
            Annuaire
          </button>
          <h1>{name}</h1>
          <p className="mono muted">
            {m.matricule} . {m.verifie ? "VERIFIE" : "NON VERIFIE"} . {m.statut.toUpperCase()}
          </p>
        </div>
        <div className="avatar">{initials(name)}</div>
      </header>

      {note && <p className="banner banner-ok">{note}</p>}
      {error && <p className="banner banner-error">{error}</p>}

      <section className="card">
        <h2 className="card-title">Identite</h2>
        <dl className="detail-grid">
          <div>
            <dt>Courriel</dt>
            <dd>{m.email}</dd>
          </div>
          <div>
            <dt>Telephone</dt>
            <dd>{m.telephone ?? "-"}</dd>
          </div>
          <div>
            <dt>Commission</dt>
            <dd>{m.commission ?? "-"}</dd>
          </div>
          <div>
            <dt>Groupe</dt>
            <dd>{m.groupe ?? "-"}</dd>
          </div>
        </dl>
      </section>

      <section className="card">
        <h2 className="card-title">Affectation</h2>
        <label className="full">
          <span>Commission</span>
          <select
            defaultValue=""
            disabled={busy}
            onChange={(e) => {
              if (e.target.value) void patch({ commission_id: e.target.value }, "Commission mise a jour.");
            }}
          >
            <option value="">Changer de commission...</option>
            {(commissions.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </label>
      </section>

      <div className="form-actions">
        {!m.verifie && (
          <button
            type="button"
            className="btn btn-primary btn-inline"
            disabled={busy}
            onClick={() => void patch({ verifie: true }, "Identite validee.")}
          >
            Valider l'identite
          </button>
        )}
        {m.statut === "actif" ? (
          <button
            type="button"
            className="btn btn-ghost btn-inline"
            disabled={busy}
            onClick={() => void patch({ statut: "inactif" }, "Membre desactive.")}
          >
            Desactiver
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-ghost btn-inline"
            disabled={busy}
            onClick={() => void patch({ statut: "actif" }, "Membre reactive.")}
          >
            Reactiver
          </button>
        )}
      </div>
    </div>
  );
}
