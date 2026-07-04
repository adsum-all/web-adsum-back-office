import { useState } from "react";

import { ApiError, getMembreGouvernance, updateMembre } from "../api.js";
import { useResource } from "../useResource.js";
import { InfoTip } from "./InfoTip.js";

const APPARTENANCES: [string, string][] = [
  ["actif", "Actif dans la fraternité"],
  ["parti", "Parti"],
  ["retire", "Retiré"],
  ["suspendu", "Suspendu"],
  ["archive", "Archivé"],
];

/**
 * Admin-only governance block: the member's relationship state with the
 * fraternity and an OPTIONAL confidential internal note (reason for a departure,
 * a title withdrawal, a suspension...). This is never shown to the member; only a
 * member writer can read or edit it here. Every change is traced in the audit log.
 */
export function MembreGouvernance({
  token,
  membreId,
  onChanged,
}: {
  token: string;
  membreId: string;
  onChanged: () => void;
}): JSX.Element {
  const gouv = useResource(() => getMembreGouvernance(token, membreId), [token, membreId]);
  const [appartenance, setAppartenance] = useState<string | null>(null);
  const [note, setNoteVal] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const current = gouv.data;
  const appartenanceValue = appartenance ?? current?.appartenance ?? "actif";
  const noteValue = note ?? current?.note_confidentielle ?? "";

  async function save(): Promise<void> {
    setBusy(true);
    setSaved(null);
    setError(null);
    try {
      await updateMembre(token, membreId, { appartenance: appartenanceValue, note_confidentielle: noteValue });
      setSaved("Zone confidentielle enregistrée.");
      gouv.reload();
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" style={{ borderColor: "var(--adsum-warn, #b5731a)" }}>
      <h2 className="card-title">
        Zone confidentielle (administration)
        <InfoTip
          title="Confidentiel"
          text="Réservé à l'administration, jamais visible du membre. État d'appartenance à la fraternité et note interne facultative (raison d'un départ, d'un retrait de titre, d'une suspension). Chaque modification est tracée."
        />
      </h2>
      <p className="muted" style={{ fontSize: 12, margin: "0 0 10px" }}>
        Non visible du membre. Réservé à l'administration.
      </p>

      {saved && <p className="banner banner-ok">{saved}</p>}
      {error && <p className="banner banner-error">{error}</p>}

      <div className="form-grid">
        <label>
          <span>État d'appartenance</span>
          <select value={appartenanceValue} disabled={busy} onChange={(e) => setAppartenance(e.target.value)}>
            {APPARTENANCES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label style={{ display: "block", marginTop: 8 }}>
        <span>Note confidentielle (facultative)</span>
        <textarea
          value={noteValue}
          disabled={busy}
          onChange={(e) => setNoteVal(e.target.value)}
          rows={3}
          placeholder="Raison d'un départ, d'un retrait de titre, information interne..."
          style={{ width: "100%", resize: "vertical" }}
        />
      </label>

      <div className="form-actions" style={{ justifyContent: "flex-start", marginTop: 12 }}>
        <button type="button" className="btn btn-primary btn-inline" disabled={busy} onClick={() => void save()}>
          Enregistrer (confidentiel)
        </button>
      </div>
    </section>
  );
}
