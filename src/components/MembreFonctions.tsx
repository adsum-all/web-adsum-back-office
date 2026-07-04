import { useState } from "react";

import {
  ApiError,
  addMembreFonction,
  deleteMembreFonction,
  getFonctions,
  getMembreFonctions,
  updateMembreFonction,
} from "../api.js";
import { useResource } from "../useResource.js";
import { InfoTip } from "./InfoTip.js";

/**
 * Manage the SEVERAL functions a member can hold at once (head of a commission,
 * referent, particular protocol...), each with its own scope, independently of
 * the consecration title. One function is the "principal" (compact display);
 * Berger/Bergere is refused here (it is a consecration title, managed above).
 */
export function MembreFonctions({
  token,
  membreId,
  onChanged,
}: {
  token: string;
  membreId: string;
  onChanged: () => void;
}): JSX.Element {
  const fonctions = useResource(() => getMembreFonctions(token, membreId), [token, membreId]);
  const types = useResource(() => getFonctions(token), [token]);
  const [cle, setCle] = useState("");
  const [perimetre, setPerimetre] = useState("");
  const [principale, setPrincipale] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(op: () => Promise<unknown>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await op();
      fonctions.reload();
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  async function ajouter(): Promise<void> {
    if (!cle) return;
    await run(() => addMembreFonction(token, membreId, { fonction_cle: cle, perimetre: perimetre.trim() || undefined, principale }));
    setCle("");
    setPerimetre("");
    setPrincipale(false);
  }

  const items = fonctions.data ?? [];
  const typeOptions = (types.data ?? []).filter((t) => !["berger", "bergere"].includes(t.cle.toLowerCase()));

  return (
    <section className="card">
      <h2 className="card-title">
        Fonctions
        <InfoTip
          title="Fonctions de responsabilité"
          text="Un membre peut cumuler plusieurs fonctions (responsable de commission, référent, protocole...), chacune avec son périmètre. Distinctes du titre de consécration Berger/Bergère. La fonction principale sert à l'affichage compact."
        />
      </h2>

      {error && <p className="banner banner-error">{error}</p>}

      {items.length === 0 && <p className="muted" style={{ fontSize: 12 }}>Aucune fonction pour ce membre.</p>}

      <ul className="list" style={{ marginBottom: 12 }}>
        {items.map((f) => (
          <li key={f.id} className="list-row" style={{ alignItems: "center", gap: 10 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <strong>{f.libelle}</strong>
              {f.perimetre ? <span className="muted"> - {f.perimetre}</span> : null}
              <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                {f.principale && <span className="badge badge-ok">Principale</span>}
                <span className={`badge ${f.confirmee ? "badge-ok" : "badge-warn"}`}>{f.confirmee ? "Confirmée" : "À valider"}</span>
                {!f.actif && <span className="badge badge-warn">Inactive</span>}
              </div>
            </div>
            <div className="list-meta" style={{ gap: 6, flexWrap: "wrap" }}>
              {!f.principale && (
                <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => void run(() => updateMembreFonction(token, membreId, f.id, { principale: true }))}>
                  Rendre principale
                </button>
              )}
              {!f.confirmee && (
                <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => void run(() => updateMembreFonction(token, membreId, f.id, { confirmee: true }))}>
                  Confirmer
                </button>
              )}
              <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => void run(() => updateMembreFonction(token, membreId, f.id, { actif: !f.actif }))}>
                {f.actif ? "Désactiver" : "Réactiver"}
              </button>
              <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => void run(() => deleteMembreFonction(token, membreId, f.id))}>
                Retirer
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="form-grid">
        <label>
          <span>Ajouter une fonction</span>
          <select value={cle} disabled={busy} onChange={(e) => setCle(e.target.value)}>
            <option value="">Choisir une fonction</option>
            {typeOptions.map((t) => (
              <option key={t.cle} value={t.cle}>
                {t.libelle_n} ({t.cle})
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Périmètre</span>
          <input value={perimetre} disabled={busy} onChange={(e) => setPerimetre(e.target.value)} placeholder="Ex : Commission KERUBIM, Mission Timothé" />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, alignSelf: "end" }}>
          <input type="checkbox" checked={principale} disabled={busy} onChange={(e) => setPrincipale(e.target.checked)} />
          <span>Fonction principale</span>
        </label>
      </div>
      <div className="form-actions" style={{ justifyContent: "flex-start", marginTop: 10 }}>
        <button type="button" className="btn btn-primary btn-inline" disabled={busy || !cle} onClick={() => void ajouter()}>
          Ajouter la fonction
        </button>
      </div>
    </section>
  );
}
