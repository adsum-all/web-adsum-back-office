import { useState } from "react";

import {
  type Comparaison,
  type DetectionDoublon,
  deciderDoublon,
  getComparaisonDoublon,
  getDoublons,
  getSeuilDoublon,
  scanDoublons,
  setSeuilDoublon,
} from "../api.js";
import { fullName } from "../format.js";
import { useResource } from "../useResource.js";

const SIGNAL_LABELS: Record<string, string> = {
  nom: "Nom",
  date_naissance: "Date de naissance",
  telephone: "Téléphone",
  ville: "Ville",
  adresse: "Adresse",
  photo: "Photo",
};

export function Doublons({ token }: { token: string }): JSX.Element {
  const detections = useResource(() => getDoublons(token), [token]);
  const seuil = useResource(() => getSeuilDoublon(token), [token]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  async function runScan(): Promise<void> {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const r = await scanDoublons(token);
      setNote(`Analyse terminée : ${r.flagged} paire(s) signalée(s) sur ${r.pairs_scanned} candidate(s) (seuil ${r.seuil}).`);
      detections.reload();
    } catch {
      setError("Analyse impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function saveSeuil(value: number): Promise<void> {
    setBusy(true);
    try {
      await setSeuilDoublon(token, value);
      seuil.reload();
    } finally {
      setBusy(false);
    }
  }

  const list: DetectionDoublon[] = detections.data ?? [];
  const active = list.filter((d) => d.statut !== "ignore");

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Détection de doublons</h1>
          <p className="muted">
            Analyse multi-critères (nom, date de naissance, téléphone, ville, adresse) pour repérer une double inscription
            ou une tentative de fraude.
          </p>
        </div>
        <button type="button" className="btn btn-primary btn-inline" disabled={busy} onClick={() => void runScan()}>
          {busy ? "Analyse..." : "Lancer l'analyse"}
        </button>
      </header>

      {note && <p className="banner banner-ok">{note}</p>}
      {error && <p className="banner banner-error">{error}</p>}

      <section className="card">
        <h2 className="card-title">Seuil de détection</h2>
        <p className="muted small">Score de similarité (0 à 1) au-delà duquel une paire est signalée.</p>
        <div className="toolbar">
          <input
            type="range"
            min={0.3}
            max={0.95}
            step={0.05}
            value={seuil.data?.seuil ?? 0.6}
            disabled={busy}
            onChange={(e) => void saveSeuil(Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span className="mono" style={{ minWidth: 44, textAlign: "right" }}>
            {(seuil.data?.seuil ?? 0.6).toFixed(2)}
          </span>
        </div>
      </section>

      {detections.error && <p className="banner banner-error">{detections.error}</p>}
      {!detections.loading && active.length === 0 && (
        <p className="banner banner-ok">Aucun doublon signalé. Lancez une analyse pour actualiser.</p>
      )}

      {active.map((d) => (
        <DetectionCard
          key={d.id}
          token={token}
          detection={d}
          open={openId === d.id}
          onToggle={() => setOpenId(openId === d.id ? null : d.id)}
          onDecided={() => detections.reload()}
        />
      ))}
    </div>
  );
}

function DetectionCard({
  token,
  detection,
  open,
  onToggle,
  onDecided,
}: {
  token: string;
  detection: DetectionDoublon;
  open: boolean;
  onToggle: () => void;
  onDecided: () => void;
}): JSX.Element {
  const [cmp, setCmp] = useState<Comparaison | null>(null);
  const [busy, setBusy] = useState(false);
  const d = detection;
  const pct = Math.round(d.score * 100);

  function toggle(): void {
    onToggle();
    if (!cmp) {
      void getComparaisonDoublon(token, d.membre_a.id, d.membre_b.id)
        .then(setCmp)
        .catch(() => undefined);
    }
  }

  async function decide(statut: "confirme" | "ignore"): Promise<void> {
    setBusy(true);
    try {
      await deciderDoublon(token, d.id, statut);
      onDecided();
    } finally {
      setBusy(false);
    }
  }

  const activeSignals = Object.entries(d.signaux).filter(([, v]) => (typeof v === "number" ? v > 0.5 : v));

  return (
    <section className="card">
      <div className="list-row" style={{ border: "none", background: "transparent", padding: 0 }}>
        <div className="event-main">
          <strong>
            {fullName(d.membre_a.prenoms, d.membre_a.nom, d.membre_a.matricule)}
            {"  vs  "}
            {fullName(d.membre_b.prenoms, d.membre_b.nom, d.membre_b.matricule)}
          </strong>
          <span className="muted small">
            {d.membre_a.matricule} . {d.membre_b.matricule}
            {d.statut === "confirme" ? " . CONFIRME" : ""}
          </span>
        </div>
        <span className={`badge ${pct >= 80 ? "badge-bad" : "badge-warn"}`}>{pct}% de similarité</span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "10px 0" }}>
        {activeSignals.map(([k, v]) => (
          <span key={k} className="pill pill-on">
            {SIGNAL_LABELS[k] ?? k}
            {typeof v === "number" ? ` ${Math.round(v * 100)}%` : ""}
          </span>
        ))}
      </div>

      <div className="toolbar">
        <button type="button" className="btn btn-ghost btn-inline" onClick={toggle}>
          {open ? "Masquer la comparaison" : "Comparer les deux profils"}
        </button>
        <button type="button" className="btn btn-primary btn-inline" disabled={busy} onClick={() => void decide("confirme")}>
          Confirmer le doublon
        </button>
        <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => void decide("ignore")}>
          Ignorer
        </button>
      </div>

      {open && cmp && (
        <table className="data-table" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Champ</th>
              <th>{cmp.a.matricule}</th>
              <th>{cmp.b.matricule}</th>
              <th>Concordance</th>
            </tr>
          </thead>
          <tbody>
            {cmp.lignes.map((l) => (
              <tr key={l.champ}>
                <td>{SIGNAL_LABELS[l.champ] ?? l.champ}</td>
                <td className={l.identique ? "" : "muted"}>{l.a ?? "-"}</td>
                <td className={l.identique ? "" : "muted"}>{l.b ?? "-"}</td>
                <td>{l.identique ? "Identique" : "Différent"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
