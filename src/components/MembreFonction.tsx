import { useState } from "react";

import { ApiError, type MembreProfile, getFonctions, validerFonctionMembre } from "../api.js";
import { useResource } from "../useResource.js";
import { InfoTip } from "./InfoTip.js";

/** Compact panel to view, assign and confirm a member's honorific function. */
export function MembreFonction({
  token,
  membre,
  onChanged,
}: {
  token: string;
  membre: MembreProfile;
  onChanged: () => void;
}): JSX.Element {
  const fonctions = useResource(() => getFonctions(token), [token]);
  const [choix, setChoix] = useState<string>(membre.fonction_cle ?? "");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const confirmee = membre.fonction_confirmee === true;

  async function valider(fonctionCle: string | undefined, confirm: boolean): Promise<void> {
    setBusy(true);
    setNote(null);
    setError(null);
    try {
      await validerFonctionMembre(token, membre.id, { fonction_cle: fonctionCle, confirmee: confirm });
      setNote(confirm ? "Fonction confirmee." : "Fonction mise a jour.");
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2 className="card-title">
        Fonction honorifique
        <InfoTip
          title="Titre honorifique"
          text="Le titre (par exemple Berger) n'apparait publiquement qu'une fois la fonction confirmee par un administrateur."
        />
      </h2>

      {note && <p className="banner banner-ok">{note}</p>}
      {error && <p className="banner banner-error">{error}</p>}

      <dl className="detail-grid">
        <div>
          <dt>Fonction declaree</dt>
          <dd>{membre.fonction_cle ?? "Aucune"}</dd>
        </div>
        <div>
          <dt>Titre resolu</dt>
          <dd>{membre.titre ?? "-"}</dd>
        </div>
        <div>
          <dt>Etat</dt>
          <dd>
            <span className={`badge ${confirmee ? "badge-ok" : "badge-warn"}`}>
              {confirmee ? "Confirmee" : "A valider"}
            </span>
          </dd>
        </div>
      </dl>

      <div className="toolbar" style={{ marginTop: 10 }}>
        <select
          className="search"
          value={choix}
          disabled={busy}
          onChange={(e) => setChoix(e.target.value)}
        >
          <option value="">Aucune fonction</option>
          {(fonctions.data ?? []).map((f) => (
            <option key={f.cle} value={f.cle}>
              {f.libelle_n} ({f.cle})
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-ghost btn-inline"
          disabled={busy || choix === (membre.fonction_cle ?? "")}
          onClick={() => void valider(choix || undefined, false)}
        >
          Assigner la fonction
        </button>
        <button
          type="button"
          className="btn btn-primary btn-inline"
          disabled={busy || (confirmee && choix === (membre.fonction_cle ?? ""))}
          onClick={() => void valider(choix || undefined, true)}
        >
          Valider la fonction
        </button>
      </div>
    </section>
  );
}
