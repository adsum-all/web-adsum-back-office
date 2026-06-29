import { useState } from "react";

import { ApiError, type MembreUpdateInput, getCommissions, getMembre, updateMembre } from "../api.js";
import { formatDate, fullName, initials } from "../format.js";
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
        <h2 className="card-title">Informations generales</h2>
        <dl className="detail-grid">
          <div>
            <dt>Telephone</dt>
            <dd>{m.telephone ?? "-"}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{m.email}</dd>
          </div>
          <div>
            <dt>Genre & Age</dt>
            <dd>{genreAge(m.genre, m.date_naissance)}</dd>
          </div>
          <div>
            <dt>Localisation</dt>
            <dd>{[m.ville, m.pays].filter(Boolean).join(", ") || "-"}</dd>
          </div>
          <div>
            <dt>Structure</dt>
            <dd>{m.intendance ?? "-"}</dd>
          </div>
          <div>
            <dt>Commission</dt>
            <dd>{m.commission ?? "-"}</dd>
          </div>
          <div>
            <dt>Berger Referent</dt>
            <dd>{m.berger ?? "Aucun"}</dd>
          </div>
          <div>
            <dt>Membre depuis</dt>
            <dd>{m.date_entree ? formatDate(m.date_entree) : "-"}</dd>
          </div>
          <div>
            <dt>Cheminement pastoral</dt>
            <dd>{cheminementLabel(m.cheminement_pastoral)}</dd>
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

const CHEMINEMENT_LABELS: Record<string, string> = {
  nouveau: "Nouveau",
  en_accompagnement: "En accompagnement",
  membre_actif: "Membre actif",
  responsable: "Responsable",
  a_relancer: "A relancer",
  en_pause: "En pause",
  ancien_membre: "Ancien membre",
};

function cheminementLabel(value: string | null): string {
  if (!value) return "-";
  return CHEMINEMENT_LABELS[value] ?? value;
}

function genreAge(genre: string | null, naissance: string | null): string {
  const g = genre ? genre.charAt(0).toUpperCase() + genre.slice(1) : null;
  let age: number | null = null;
  if (naissance) {
    const d = new Date(naissance);
    if (!Number.isNaN(d.getTime())) {
      age = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
    }
  }
  if (g && age !== null) return `${g} (${age} ans)`;
  if (g) return g;
  if (age !== null) return `${age} ans`;
  return "-";
}
