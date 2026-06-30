import { useEffect, useState } from "react";

import {
  type DemandeDetailAdmin,
  type DemandeItem,
  type ModificationItem,
  decideDemandeModification,
  getAdminDemande,
  getAdminDemandes,
  getDemandeModifications,
  replyAdminDemande,
  updateAdminDemande,
} from "../api.js";
import { useResource } from "../useResource.js";

const STATUT: Record<string, string> = {
  ouverte: "badge-warn",
  en_cours: "badge-mut",
  en_validation: "badge-warn",
  resolue: "badge-ok",
  refusee: "badge-bad",
};

function formatVal(v: string | number | boolean | null): string {
  if (v === null || v === undefined || v === "") return "(vide)";
  if (typeof v === "boolean") return v ? "Oui" : "Non";
  return String(v);
}

const UNLOCKABLE = [
  "nom",
  "prenoms",
  "telephone",
  "ville",
  "pays",
  "date_naissance",
  "situation_matrimoniale",
  "profession",
  "niveau_etudes",
];

export function DemandesAdmin({ token }: { token: string }): JSX.Element {
  const { data, loading, error, reload } = useResource(() => getAdminDemandes(token), [token]);
  const [openId, setOpenId] = useState<string | null>(null);

  const list: DemandeItem[] = data ?? [];

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Demandes des membres</h1>
          <p className="muted">Messagerie, demandes de modification et déblocage de champs.</p>
        </div>
      </header>

      {error && <p className="banner banner-error">{error}</p>}
      {loading && <p className="muted">Chargement...</p>}
      {!loading && list.length === 0 && !error && <p className="muted">Aucune demande pour le moment.</p>}

      <div className="card-grid-2">
        <div>
          {list.map((d) => (
            <button
              key={d.id}
              type="button"
              className={`list-row ${openId === d.id ? "row-active" : ""}`}
              style={{ width: "100%", textAlign: "left", cursor: "pointer", marginBottom: 8 }}
              onClick={() => setOpenId(d.id)}
            >
              <span className="event-main">
                <strong>{d.sujet}</strong>
                <span className="muted small">
                  {d.membre_nom} · {d.type} · {d.nb_messages} msg
                </span>
              </span>
              <span className={`badge ${STATUT[d.statut] ?? "badge-mut"}`}>{d.statut}</span>
            </button>
          ))}
        </div>
        {openId && <Conversation token={token} id={openId} onChanged={reload} />}
      </div>
    </div>
  );
}

function Conversation({ token, id, onChanged }: { token: string; id: string; onChanged: () => void }): JSX.Element {
  const [detail, setDetail] = useState<DemandeDetailAdmin | null>(null);
  const [mods, setMods] = useState<ModificationItem[]>([]);
  const [draft, setDraft] = useState("");
  const [fields, setFields] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = (): void => {
    void getAdminDemande(token, id).then(setDetail).catch(() => undefined);
    void getDemandeModifications(token, id).then(setMods).catch(() => setMods([]));
  };
  useEffect(load, [token, id]);

  async function reply(): Promise<void> {
    if (!draft.trim()) return;
    await replyAdminDemande(token, id, draft.trim());
    setDraft("");
    load();
  }

  async function setStatut(statut: string): Promise<void> {
    await updateAdminDemande(token, id, { statut });
    load();
    onChanged();
  }

  async function unlock(): Promise<void> {
    await updateAdminDemande(token, id, { statut: "en_cours", champs_deverrouilles: fields });
    load();
    onChanged();
  }

  async function decide(decision: "valider" | "rejeter"): Promise<void> {
    setBusy(true);
    try {
      await decideDemandeModification(token, id, decision);
      load();
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  const pending = mods.find((m) => m.statut === "en_attente");

  if (!detail) return <div className="card"><p className="muted">Chargement...</p></div>;

  return (
    <div className="card">
      <h2 className="card-title">{detail.sujet}</h2>
      <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {detail.messages.map((m) => (
          <div key={m.id} style={{ alignSelf: m.auteur_type === "staff" ? "flex-end" : "flex-start", maxWidth: "85%" }}>
            <div className={m.auteur_type === "staff" ? "bubble-staff" : "bubble-membre"}>{m.corps}</div>
            <span className="muted" style={{ fontSize: 10 }}>
              {m.auteur_nom} · {m.cree_le ? new Date(m.cree_le).toLocaleString("fr-FR") : ""}
            </span>
          </div>
        ))}
      </div>
      <div className="toolbar">
        <input className="search" value={draft} placeholder="Répondre au membre..." onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void reply()} />
        <button type="button" className="btn btn-primary btn-inline" disabled={!draft.trim()} onClick={() => void reply()}>
          Envoyer
        </button>
      </div>

      {pending && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--adsum-line)" }}>
          <p className="card-title" style={{ marginBottom: 8 }}>Validation finale de la modification</p>
          <table className="data-table" style={{ marginBottom: 10 }}>
            <thead>
              <tr>
                <th>Champ</th>
                <th>Valeur actuelle</th>
                <th>Valeur proposée</th>
              </tr>
            </thead>
            <tbody>
              {pending.diff.map((d) => (
                <tr key={d.champ}>
                  <td>{d.champ}</td>
                  <td className="muted">{formatVal(d.avant)}</td>
                  <td style={{ fontWeight: 600 }}>{formatVal(d.apres)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="form-actions" style={{ justifyContent: "flex-start" }}>
            <button type="button" className="btn btn-primary btn-inline" disabled={busy} onClick={() => void decide("valider")}>
              Valider et enregistrer
            </button>
            <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => void decide("rejeter")}>
              Rejeter la modification
            </button>
          </div>
        </div>
      )}

      {detail.type === "modification_info" && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--adsum-line)" }}>
          <p className="card-title" style={{ marginBottom: 8 }}>Débloquer des champs pour modification</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            {UNLOCKABLE.map((f) => (
              <label key={f} className="check small">
                <input type="checkbox" checked={fields.includes(f)} onChange={(e) => setFields((prev) => (e.target.checked ? [...prev, f] : prev.filter((x) => x !== f)))} />
                {f}
              </label>
            ))}
          </div>
          <button type="button" className="btn btn-primary btn-inline" disabled={fields.length === 0} onClick={() => void unlock()}>
            Débloquer ({fields.length})
          </button>
        </div>
      )}

      <div className="form-actions" style={{ marginTop: 12 }}>
        <button type="button" className="btn btn-ghost btn-inline" onClick={() => void setStatut("refusee")}>
          Refuser
        </button>
        <button type="button" className="btn btn-primary btn-inline" onClick={() => void setStatut("resolue")}>
          Marquer résolu
        </button>
      </div>
    </div>
  );
}
