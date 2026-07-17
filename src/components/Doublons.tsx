import { useState } from "react";

import {
  type ApercuFusion,
  type Comparaison,
  type DecisionDoublon,
  type DetectionDoublon,
  apercuFusionDoublon,
  deciderDoublon,
  fusionnerDoublon,
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

export function Doublons({ token, canStatuer = false, canScanner = false }: { token: string; canStatuer?: boolean; canScanner?: boolean }): JSX.Element {
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
        {canScanner && (
          <button type="button" className="btn btn-primary btn-inline" disabled={busy} onClick={() => void runScan()}>
            {busy ? "Analyse..." : "Lancer l'analyse"}
          </button>
        )}
      </header>

      {note && <p className="banner banner-ok">{note}</p>}
      {error && <p className="banner banner-error">{error}</p>}

      <section className="card">
        <h2 className="card-title">Seuil de détection</h2>
        <p className="muted small">Score de similarité (0 à 1) au-delà duquel une paire est signalée.</p>
        {canScanner ? (
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
        ) : (
          <div className="toolbar">
            <span className="mono" style={{ minWidth: 44 }}>{(seuil.data?.seuil ?? 0.6).toFixed(2)}</span>
            <span className="muted small">Lecture seule : le réglage du seuil requiert la permission doublons.administrer.</span>
          </div>
        )}
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
          canStatuer={canStatuer}
          canScanner={canScanner}
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
  canStatuer,
  canScanner,
  open,
  onToggle,
  onDecided,
}: {
  token: string;
  detection: DetectionDoublon;
  // doublons.gerer: decide a detection (confirm / documents / distinct persons).
  canStatuer: boolean;
  // doublons.administrer: merge two records (POST /admin/doublons/fusion).
  canScanner: boolean;
  open: boolean;
  onToggle: () => void;
  onDecided: () => void;
}): JSX.Element {
  const [cmp, setCmp] = useState<Comparaison | null>(null);
  const [busy, setBusy] = useState(false);
  // Merge flow: which member is kept, the pre-flight, and any error.
  const [survivant, setSurvivant] = useState<"a" | "b" | null>(null);
  const [apercu, setApercu] = useState<ApercuFusion | null>(null);
  const [fusionErr, setFusionErr] = useState<string | null>(null);
  const d = detection;
  const pct = Math.round(d.score * 100);

  async function ouvrirFusion(keep: "a" | "b"): Promise<void> {
    setSurvivant(keep); setApercu(null); setFusionErr(null); setBusy(true);
    const sid = keep === "a" ? d.membre_a.id : d.membre_b.id;
    const did = keep === "a" ? d.membre_b.id : d.membre_a.id;
    try { setApercu(await apercuFusionDoublon(token, sid, did)); }
    catch (e) { setFusionErr(e instanceof Error ? e.message : "Erreur"); }
    finally { setBusy(false); }
  }

  async function confirmerFusion(): Promise<void> {
    if (!survivant) return;
    const sid = survivant === "a" ? d.membre_a.id : d.membre_b.id;
    const did = survivant === "a" ? d.membre_b.id : d.membre_a.id;
    setBusy(true); setFusionErr(null);
    try { await fusionnerDoublon(token, sid, did); onDecided(); }
    catch (e) { setFusionErr(e instanceof Error ? e.message : "Erreur"); }
    finally { setBusy(false); }
  }

  function toggle(): void {
    onToggle();
    if (!cmp) {
      void getComparaisonDoublon(token, d.membre_a.id, d.membre_b.id)
        .then(setCmp)
        .catch(() => undefined);
    }
  }

  async function decide(statut: DecisionDoublon, note?: string): Promise<void> {
    setBusy(true);
    try {
      await deciderDoublon(token, d.id, statut, note);
      onDecided();
    } finally {
      setBusy(false);
    }
  }

  function demanderDocuments(): void {
    const note = window.prompt(
      "Quel document ou vérification demander pour départager ces deux profils ?\n" +
        "Exemple : pièce d'identité recto-verso, acte de naissance, justificatif de domicile.",
      "Pièce d'identité recto-verso",
    );
    if (note === null) return; // annulé
    void decide("documents_demandes", note.trim() || undefined);
  }

  const activeSignals = Object.entries(d.signaux).filter(([, v]) => (typeof v === "number" ? v > 0.5 : v));
  const enAttente = d.statut === "documents_demandes";

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
            {d.statut === "confirme" ? " . DOUBLON CONFIRME" : ""}
          </span>
        </div>
        <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {enAttente && <span className="badge badge-warn">Documents demandés</span>}
          <span className={`badge ${pct >= 80 ? "badge-bad" : "badge-warn"}`}>{pct}% de similarité</span>
        </span>
      </div>

      {d.note && (
        <p className="banner banner-info small" style={{ textAlign: "left" }}>
          {enAttente ? "Vérification demandée : " : "Note : "}
          {d.note}
        </p>
      )}

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
        {canStatuer && (
          <>
            <button type="button" className="btn btn-primary btn-inline" disabled={busy} onClick={() => void decide("confirme")}>
              Confirmer le doublon
            </button>
            <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={demanderDocuments}>
              Demander des documents
            </button>
            <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => void decide("ignore")}>
              Personnes distinctes
            </button>
          </>
        )}
        {canScanner && (
          <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => { setSurvivant(null); setApercu(null); setFusionErr(null); setSurvivant("a"); void ouvrirFusion("a"); }}>
            Fusionner…
          </button>
        )}
        {!canStatuer && !canScanner && (
          <span className="muted small">Consultation seule. Le tri des doublons requiert « Doublons - gerer » ; la fusion requiert « Doublons - administrer ».</span>
        )}
      </div>

      {survivant !== null && (
        <div className="banner banner-info" style={{ textAlign: "left", marginTop: 10 }}>
          <strong>Fusionner ces deux fiches en une seule</strong>
          <p className="muted small" style={{ margin: "4px 0 8px" }}>
            Choisissez la fiche à <strong>conserver</strong> ; toutes les données de l'autre (présences, fonctions,
            engagements, notifications…) lui sont rattachées, puis l'autre fiche est supprimée. Action définitive et tracée.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" className={`btn btn-inline ${survivant === "a" ? "btn-primary" : "btn-ghost"}`} disabled={busy} onClick={() => void ouvrirFusion("a")}>
              Conserver {fullName(d.membre_a.prenoms, d.membre_a.nom, d.membre_a.matricule)}
            </button>
            <button type="button" className={`btn btn-inline ${survivant === "b" ? "btn-primary" : "btn-ghost"}`} disabled={busy} onClick={() => void ouvrirFusion("b")}>
              Conserver {fullName(d.membre_b.prenoms, d.membre_b.nom, d.membre_b.matricule)}
            </button>
            <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => { setSurvivant(null); setApercu(null); }}>Annuler</button>
          </div>
          {apercu && (
            <div style={{ marginTop: 8 }}>
              {apercu.bloque_deux_comptes ? (
                <p className="banner banner-error small" style={{ margin: 0 }}>Les deux fiches ont un compte de connexion : désactivez ou fusionnez l'un des comptes d'abord.</p>
              ) : (
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span className="small"><strong>{apercu.references_a_deplacer}</strong> élément(s) seront rattachés à la fiche conservée.</span>
                  <button type="button" className="btn btn-inline" style={{ background: "var(--adsum-danger)", color: "#fff" }} disabled={busy} onClick={() => void confirmerFusion()}>
                    Fusionner définitivement
                  </button>
                </div>
              )}
            </div>
          )}
          {fusionErr && <p className="banner banner-error small" style={{ marginTop: 6 }}>{fusionErr}</p>}
        </div>
      )}

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
