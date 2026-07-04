import { useState } from "react";

import { ApiError, type MembreProfile, type MembreUpdateInput, updateMembre } from "../api.js";
import { InfoTip } from "./InfoTip.js";

/**
 * Admin panel to manage the consecration TITLE (Berger/Bergere) and the civil
 * identity refinements of an existing member, at any time after registration.
 * The consecration title is a distinct concept from the honorific function
 * (managed in MembreFonction): a member can be Berger/Bergere with zero, one or
 * several functions, and the title can be granted or withdrawn independently.
 */
export function MembreConsecration({
  token,
  membre,
  onChanged,
}: {
  token: string;
  membre: MembreProfile;
  onChanged: () => void;
}): JSX.Element {
  const [estBerger, setEstBerger] = useState(membre.est_berger === true);
  const [nomPastoral, setNomPastoral] = useState(membre.nom_pastoral ?? "");
  const [nomNaissance, setNomNaissance] = useState(membre.nom_naissance ?? "");
  const [nomMarital, setNomMarital] = useState(membre.nom_marital ?? "");
  const [nomAffiche, setNomAffiche] = useState(membre.nom_affiche ?? "");
  const [perimetre, setPerimetre] = useState(membre.fonction_perimetre ?? "");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const label = membre.genre === "femme" ? "Bergère" : "Berger";
  const preview = estBerger && nomPastoral.trim() ? `${label} ${nomPastoral.trim()}` : null;

  async function save(input: MembreUpdateInput, message: string): Promise<void> {
    setBusy(true);
    setNote(null);
    setError(null);
    try {
      await updateMembre(token, membre.id, input);
      setNote(message);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  const retirer = (): Promise<void> => {
    setEstBerger(false);
    setNomPastoral("");
    return save({ est_berger: false, nom_pastoral: "" }, "Titre de consécration retiré.");
  };

  const enregistrer = (): Promise<void> =>
    save(
      {
        est_berger: estBerger,
        nom_pastoral: nomPastoral.trim() || "",
        nom_naissance: nomNaissance.trim() || "",
        nom_marital: nomMarital.trim() || "",
        nom_affiche: nomAffiche || undefined,
        fonction_perimetre: perimetre.trim() || "",
      },
      "Identité et titre de consécration enregistrés.",
    );

  return (
    <section className="card">
      <h2 className="card-title">
        Titre de consécration (Berger / Bergère)
        <InfoTip
          title="Nom de consécration"
          text="Le titre Berger/Bergère est un nom de consécration, distinct d'une fonction. Une personne peut être Berger/Bergère sans fonction, ou cumuler plusieurs fonctions. Attribuable, modifiable et retirable à tout moment."
        />
      </h2>

      {note && <p className="banner banner-ok">{note}</p>}
      {error && <p className="banner banner-error">{error}</p>}

      <div className="form-grid">
        <label>
          <span>Est Berger / Bergère</span>
          <select value={estBerger ? "1" : "0"} disabled={busy} onChange={(e) => setEstBerger(e.target.value === "1")}>
            <option value="0">Non</option>
            <option value="1">Oui</option>
          </select>
        </label>
        <label>
          <span>Nom de consécration</span>
          <input value={nomPastoral} disabled={busy || !estBerger} onChange={(e) => setNomPastoral(e.target.value)} placeholder="Ex : Christ Marie" />
          <small style={{ color: "var(--adsum-mut, #6b7280)", fontSize: 11 }}>Affiché : {preview ?? "-"}</small>
        </label>
        <label>
          <span>Nom de naissance</span>
          <input value={nomNaissance} disabled={busy} onChange={(e) => setNomNaissance(e.target.value)} placeholder="Facultatif" />
        </label>
        <label>
          <span>Nom marital</span>
          <input value={nomMarital} disabled={busy} onChange={(e) => setNomMarital(e.target.value)} placeholder="Facultatif" />
        </label>
        <label>
          <span>Nom civil affiché</span>
          <select value={nomAffiche} disabled={busy} onChange={(e) => setNomAffiche(e.target.value)}>
            <option value="">Nom de famille (par défaut)</option>
            <option value="naissance">Nom de naissance</option>
            <option value="marital">Nom marital</option>
          </select>
        </label>
        <label>
          <span>Fonction : périmètre</span>
          <input value={perimetre} disabled={busy} onChange={(e) => setPerimetre(e.target.value)} placeholder="Ex : Commission Communication" />
        </label>
      </div>

      <div className="form-actions" style={{ justifyContent: "flex-start", marginTop: 12 }}>
        <button type="button" className="btn btn-primary btn-inline" disabled={busy} onClick={() => void enregistrer()}>
          Enregistrer
        </button>
        {membre.est_berger && (
          <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => void retirer()}>
            Retirer le titre
          </button>
        )}
      </div>
    </section>
  );
}
