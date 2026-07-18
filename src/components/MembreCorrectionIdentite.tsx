import { useState } from "react";

import { ApiError, type MembreProfile, type MembreUpdateInput, updateMembre } from "../api.js";
import { PAYS as PAYS_REF } from "../countries.js";
import { PaysCombo } from "./PaysCombo.js";

const CHAMPS: { key: keyof MembreUpdateInput; label: string; from: keyof MembreProfile }[] = [
  { key: "nom", label: "Nom de famille", from: "nom" },
  { key: "prenoms", label: "Prénom(s)", from: "prenoms" },
  { key: "code_membre", label: "Code membre", from: "code_membre" },
  { key: "telephone", label: "Téléphone", from: "telephone" },
  { key: "ville", label: "Ville", from: "ville" },
  { key: "pays", label: "Pays", from: "pays" },
  { key: "profession", label: "Profession", from: "profession" },
];

/**
 * Direct correction of a member's identity by an authorized administrator, without
 * a member modification request. Reserved to membres.administrer (admin, or a
 * delegated group). Every change is written straight to the profile and audited
 * server side. The preferred path stays the member request, which leaves a fuller
 * trail; this is for quick corrections (e.g. a misspelled name).
 */
export function MembreCorrectionIdentite({
  token,
  membre,
  onChanged,
}: {
  token: string;
  membre: MembreProfile;
  onChanged: () => void;
}): JSX.Element {
  const [vals, setVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(CHAMPS.map((c) => [c.key, (membre[c.from] as string | null) ?? ""])),
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const modifie = CHAMPS.filter((c) => vals[c.key] !== ((membre[c.from] as string | null) ?? ""));

  // Country is stored as a name; the combo works with codes. These helpers keep the
  // JSX shallow (no deep nesting) while enforcing a controlled country value.
  const paysCode = PAYS_REF.find((p) => p.nom === (vals.pays ?? ""))?.code ?? "";
  const changerPays = (code: string): void => setVals((prev) => ({ ...prev, pays: PAYS_REF.find((p) => p.code === code)?.nom ?? "" }));
  const changerChamp = (key: string, valeur: string): void => setVals((prev) => ({ ...prev, [key]: valeur }));

  async function enregistrer(): Promise<void> {
    if (modifie.length === 0) return;
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const input: MembreUpdateInput = {};
      for (const c of modifie) (input as Record<string, string>)[c.key] = (vals[c.key] ?? "").trim();
      await updateMembre(token, membre.id, input);
      setMsg(`Identité corrigée (${modifie.map((c) => c.label.toLowerCase()).join(", ")}).`);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Correction impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" style={{ marginBottom: 16 }}>
      <h3 className="card-title">Correction directe de l&apos;identité</h3>
      <p className="muted small" style={{ marginTop: 0 }}>
        Corrigez directement une information sans passer par une demande au membre (par exemple un nom mal
        orthographié). Opération réservée à l&apos;administration et tracée. Pour un changement important, préférez
        la demande de modification, qui conserve une traçabilité plus complète.
      </p>
      <div className="form-grid">
        {CHAMPS.map((c) => (
          <label key={String(c.key)}>
            <span>{c.label}</span>
            {c.key === "pays" ? (
              // Country is a controlled referential, never free text: pick from the
              // list so the stored value stays consistent for statistics.
              <PaysCombo value={paysCode} onChange={changerPays} placeholder="Pays (tapez pour filtrer)" />
            ) : (
              <input
                value={vals[c.key] ?? ""}
                onChange={(e) => changerChamp(String(c.key), e.target.value)}
                style={c.key === "nom" || c.key === "code_membre" ? { textTransform: "uppercase" } : undefined}
              />
            )}
          </label>
        ))}
      </div>
      {msg && <p className="banner banner-ok">{msg}</p>}
      {error && <p className="banner banner-error">{error}</p>}
      <div className="form-actions">
        <button type="button" className="btn btn-primary btn-inline" disabled={busy || modifie.length === 0} onClick={() => void enregistrer()}>
          {busy ? "Enregistrement..." : `Enregistrer la correction${modifie.length ? ` (${modifie.length})` : ""}`}
        </button>
      </div>
    </section>
  );
}
