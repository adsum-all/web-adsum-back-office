import { useEffect, useState } from "react";

import {
  type DemandeDetailAdmin,
  type DemandeItem,
  type ModificationItem,
  decideDemandeModification,
  demanderPieceDemande,
  fetchDocumentContentUrl,
  getAdminDemande,
  getAdminDemandes,
  type ElementDeblocable,
  getDemandeModifications,
  getDemandePhotoPending,
  getDocumentUrl,
  getElementsDeblocables,
  prendreEnChargeDemande,
  replyAdminDemande,
  updateAdminDemande,
} from "../api.js";
import { useResource } from "../useResource.js";

const STATUT: Record<string, string> = {
  ouverte: "badge-warn",
  en_cours: "badge-mut",
  pieces_demandees: "badge-warn",
  attente_membre: "badge-warn",
  en_validation: "badge-warn",
  resolue: "badge-ok",
  refusee: "badge-bad",
};
const STATUT_LIBELLE: Record<string, string> = {
  ouverte: "Ouverte",
  en_cours: "En cours",
  pieces_demandees: "Pièces demandées",
  attente_membre: "Attente membre",
  en_validation: "En validation",
  resolue: "Résolue",
  refusee: "Refusée",
};
const CATEGORIES = ["profil", "coordonnees", "rattachement", "documents", "carte", "activites", "compte", "autre"];

function formatVal(v: string | number | boolean | null): string {
  if (v === null || v === undefined || v === "") return "(vide)";
  if (typeof v === "boolean") return v ? "Oui" : "Non";
  return String(v);
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Step path of the request so the staff sees at a glance where it stands. */
function Etapes({ d }: { d: DemandeDetailAdmin }): JSX.Element {
  const closed = d.statut === "resolue" || d.statut === "refusee";
  const enCharge = Boolean(d.pris_en_charge_le) || d.statut !== "ouverte";
  const traitement: Record<string, string> = {
    en_cours: "En cours de traitement",
    pieces_demandees: "Pièces attendues du membre",
    attente_membre: "Réponse attendue du membre",
    en_validation: "En validation",
  };
  const steps: { label: string; date?: string | null; state: "done" | "current" | "todo" }[] = [
    { label: "Envoyée", date: d.cree_le, state: "done" },
    { label: "Prise en charge", date: d.pris_en_charge_le, state: enCharge ? "done" : "current" },
    { label: traitement[d.statut] ?? "Traitement", state: closed ? "done" : enCharge ? "current" : "todo" },
    { label: d.statut === "resolue" ? "Résolue" : d.statut === "refusee" ? "Refusée" : "Clôture", date: d.clos_le, state: closed ? "done" : "todo" },
  ];
  return (
    <div style={{ display: "flex", border: "1px solid var(--adsum-line)", borderRadius: 10, padding: "10px 6px", marginBottom: 12 }}>
      {steps.map((s, i) => {
        const color = s.state === "done" ? "var(--adsum-ok, #1e8e5a)" : s.state === "current" ? "var(--adsum-accent, #2a4fad)" : "var(--adsum-line)";
        return (
          <div key={s.label} style={{ flex: 1, textAlign: "center", position: "relative" }}>
            {i > 0 && <div style={{ position: "absolute", left: "-50%", right: "50%", top: 8, height: 2, background: s.state === "todo" ? "var(--adsum-line)" : "var(--adsum-ok, #1e8e5a)" }} />}
            <div style={{ position: "relative", width: 16, height: 16, margin: "0 auto", borderRadius: "50%", background: s.state === "todo" ? "transparent" : color, border: `2px solid ${color}`, color: "#fff", fontSize: 9, lineHeight: "12px", fontWeight: 700 }}>
              {s.state === "done" ? "✓" : ""}
            </div>
            <div style={{ fontSize: 10.5, fontWeight: s.state === "current" ? 700 : 500, marginTop: 4, lineHeight: 1.25 }}>{s.label}</div>
            {s.date && <div className="muted" style={{ fontSize: 9 }}>{fmtDate(s.date)}</div>}
          </div>
        );
      })}
    </div>
  );
}

export function DemandesAdmin({ token }: { token: string }): JSX.Element {
  const [fStatut, setFStatut] = useState("");
  const [fCat, setFCat] = useState("");
  const [fQ, setFQ] = useState("");
  const { data, loading, error, reload } = useResource(
    () => getAdminDemandes(token, { statut: fStatut || undefined, categorie: fCat || undefined, q: fQ || undefined }),
    [token, fStatut, fCat, fQ],
  );
  const [openId, setOpenId] = useState<string | null>(null);

  const list: DemandeItem[] = data ?? [];

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Demandes des membres</h1>
          <p className="muted">Tickets suivis de l'ouverture à la clôture : messagerie, pièces, validation.</p>
        </div>
      </header>

      <div className="toolbar" style={{ marginBottom: 10, gap: 8 }}>
        <select value={fStatut} onChange={(e) => setFStatut(e.target.value)}>
          <option value="">Tous statuts</option>
          {Object.entries(STATUT_LIBELLE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={fCat} onChange={(e) => setFCat(e.target.value)}>
          <option value="">Toutes catégories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input className="search" value={fQ} placeholder="Rechercher (sujet, membre)..." onChange={(e) => setFQ(e.target.value)} />
      </div>

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
                  {d.numero} · {d.membre_nom} · {d.categorie ?? d.type} · {d.nb_messages} msg
                </span>
              </span>
              <span className={`badge ${STATUT[d.statut] ?? "badge-mut"}`}>{STATUT_LIBELLE[d.statut] ?? d.statut}</span>
            </button>
          ))}
        </div>
        {openId && <Conversation token={token} id={openId} onChanged={reload} />}
      </div>
    </div>
  );
}

export function Conversation({ token, id, onChanged }: { token: string; id: string; onChanged: () => void }): JSX.Element {
  const [detail, setDetail] = useState<DemandeDetailAdmin | null>(null);
  const [mods, setMods] = useState<ModificationItem[]>([]);
  const [photoPending, setPhotoPending] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [fields, setFields] = useState<string[]>([]);
  const [elements, setElements] = useState<ElementDeblocable[]>([]);
  const [delaiJours, setDelaiJours] = useState<string>("");
  useEffect(() => {
    void getElementsDeblocables(token).then(setElements).catch(() => setElements([]));
  }, [token]);
  const [busy, setBusy] = useState(false);
  // Inline decision panel: the reason is typed inside the app (never a browser
  // prompt) and stays optional for resolve/refuse.
  const [action, setAction] = useState<"resolue" | "refusee" | "piece" | null>(null);
  const [actionTexte, setActionTexte] = useState("");
  const [actionErreur, setActionErreur] = useState<string | null>(null);
  const [pieceErreur, setPieceErreur] = useState<string | null>(null);

  const load = (): void => {
    void getAdminDemande(token, id).then(setDetail).catch(() => undefined);
    void getDemandeModifications(token, id).then(setMods).catch(() => setMods([]));
    void getDemandePhotoPending(token, id).then((r) => setPhotoPending(r.url)).catch(() => setPhotoPending(null));
  };
  useEffect(load, [token, id]);

  async function reply(): Promise<void> {
    if (!draft.trim()) return;
    await replyAdminDemande(token, id, draft.trim());
    setDraft("");
    load();
  }

  async function setStatut(statut: string, motif?: string): Promise<void> {
    await updateAdminDemande(token, id, motif ? { statut, motif } : { statut });
    load();
    onChanged();
  }

  function ouvrirPanneau(cible: "resolue" | "refusee" | "piece"): void {
    setAction((prev) => (prev === cible ? null : cible));
    setActionTexte("");
    setActionErreur(null);
  }

  async function confirmerAction(): Promise<void> {
    if (!action || busy) return;
    const texte = actionTexte.trim();
    if (action === "piece" && !texte) {
      setActionErreur("Décrivez la pièce attendue : ce texte guide le membre.");
      return;
    }
    setBusy(true);
    setActionErreur(null);
    try {
      if (action === "piece") {
        await demanderPieceDemande(token, id, texte);
        load();
        onChanged();
      } else {
        await setStatut(action, texte || undefined);
      }
      setAction(null);
      setActionTexte("");
    } catch {
      setActionErreur("Action impossible. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  async function ouvrirPiece(documentId: string): Promise<void> {
    setPieceErreur(null);
    try {
      const r = await getDocumentUrl(token, documentId);
      if (r.url) {
        window.open(r.url, "_blank", "noreferrer");
        return;
      }
      const objectUrl = await fetchDocumentContentUrl(token, `/api/v1/admin/documents/${documentId}/content`);
      window.open(objectUrl, "_blank", "noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } catch {
      setPieceErreur("Pièce indisponible pour le moment. Réessayez ou vérifiez le document du membre.");
    }
  }

  async function unlock(): Promise<void> {
    const delai = delaiJours.trim() ? Number(delaiJours) : undefined;
    await updateAdminDemande(token, id, { champs_deverrouilles: fields, delai_jours: delai });
    setFields([]);
    setDelaiJours("");
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
      <p className="muted small" style={{ marginTop: 0 }}>
        {detail.numero} · {STATUT_LIBELLE[detail.statut] ?? detail.statut}
        {detail.motif_cloture ? ` · motif : ${detail.motif_cloture}` : ""}
        {detail.pris_en_charge_le
          ? ` · prise en charge${detail.pris_en_charge_par_email ? ` par ${detail.pris_en_charge_par_email}` : ""} le ${fmtDate(detail.pris_en_charge_le)}`
          : " · pas encore prise en charge"}
        {detail.echeance_reponse ? ` · réponse du membre attendue avant le ${new Date(detail.echeance_reponse).toLocaleDateString("fr-FR")}` : ""}
      </p>
      <Etapes d={detail} />
      {detail.statut === "ouverte" && (
        <div style={{ marginBottom: 10 }}>
          <button
            type="button"
            className="btn btn-primary btn-inline"
            onClick={() => void prendreEnChargeDemande(token, id).then(() => { load(); onChanged(); })}
          >
            Prendre en charge la demande
          </button>
        </div>
      )}
      <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {detail.messages.map((m) =>
          m.auteur_type === "systeme" ? (
            <div key={m.id} style={{ alignSelf: "center", textAlign: "center" }}>
              <span className="muted" style={{ fontSize: 10.5, border: "1px dashed var(--adsum-line)", borderRadius: 8, padding: "3px 9px" }}>
                {m.corps} · {m.cree_le ? new Date(m.cree_le).toLocaleString("fr-FR") : ""}
              </span>
            </div>
          ) : (
            <div key={m.id} style={{ alignSelf: m.auteur_type === "staff" ? "flex-end" : "flex-start", maxWidth: "85%" }}>
              <div className={m.auteur_type === "staff" ? "bubble-staff" : "bubble-membre"}>
                {m.corps}
                {m.document_id && (
                  <div>
                    <button type="button" className="link" style={{ fontSize: 11 }} onClick={() => void ouvrirPiece(m.document_id as string)}>
                      Ouvrir la pièce jointe
                    </button>
                  </div>
                )}
              </div>
              <span className="muted" style={{ fontSize: 10 }}>
                {m.auteur_nom} · {m.cree_le ? new Date(m.cree_le).toLocaleString("fr-FR") : ""}
                {m.auteur_type !== "membre"
                  ? m.lu_par_membre_le
                    ? <span style={{ color: "var(--adsum-ok)", fontWeight: 700 }}> · Lu par le membre {new Date(m.lu_par_membre_le).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                    : " · Envoyé"
                  : null}
              </span>
            </div>
          ),
        )}
      </div>
      <div className="toolbar">
        <input className="search" value={draft} placeholder="Répondre au membre..." onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void reply()} />
        <button type="button" className="btn btn-primary btn-inline" disabled={!draft.trim()} onClick={() => void reply()}>
          Envoyer
        </button>
      </div>

      {(pending || photoPending) && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--adsum-line)" }}>
          <p className="card-title" style={{ marginBottom: 8 }}>Validation finale de la modification</p>
          {pending && (
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
          )}
          {photoPending && (
            <div style={{ marginBottom: 10 }}>
              <p className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Nouvelle photo d'identité proposée par le membre :</p>
              <img src={photoPending} alt="Nouvelle photo proposée" style={{ width: 96, height: 120, borderRadius: 12, objectFit: "cover", objectPosition: "50% 30%", border: "1px solid var(--adsum-line)" }} />
            </div>
          )}
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

      {detail.statut !== "resolue" && detail.statut !== "refusee" && elements.length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--adsum-line)" }}>
          <p className="card-title" style={{ marginBottom: 4 }}>Débloquer des éléments pour correction</p>
          <p className="muted small" style={{ marginTop: 0 }}>
            Le membre reçoit automatiquement un message dans cette demande avec la liste débloquée et la date limite.
          </p>
          {(["champ", "photo", "document"] as const).map((type) => {
            const groupe = elements.filter((e) => e.type === type);
            if (groupe.length === 0) return null;
            const titreGroupe = type === "champ" ? "Champs du profil" : type === "photo" ? "Photo" : "Pièces et documents";
            return (
              <div key={type} style={{ marginBottom: 8 }}>
                <p className="muted small" style={{ margin: "6px 0 4px", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, fontSize: 10.5 }}>{titreGroupe}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {groupe.map((e) => (
                    <label key={e.cle} className="check small" title={e.sensibilite === "haute" ? "Élément sensible (identité)" : undefined}>
                      <input
                        type="checkbox"
                        checked={fields.includes(e.cle)}
                        onChange={(ev) => setFields((prev) => (ev.target.checked ? [...prev, e.cle] : prev.filter((x) => x !== e.cle)))}
                      />
                      {e.libelle}
                      {e.sensibilite === "haute" ? <span className="badge badge-warn" style={{ marginLeft: 6 }}>sensible</span> : null}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="form-actions" style={{ justifyContent: "flex-start", alignItems: "center", gap: 10, marginTop: 8 }}>
            <label className="muted small" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              Délai de retour (jours)
              <input
                type="number"
                min={1}
                max={90}
                placeholder="Réglage global"
                value={delaiJours}
                onChange={(e) => setDelaiJours(e.target.value)}
                style={{ width: 130, border: "1px solid var(--adsum-line)", borderRadius: 8, padding: "7px 10px", font: "inherit" }}
              />
            </label>
            <button type="button" className="btn btn-primary btn-inline" disabled={fields.length === 0} onClick={() => void unlock()}>
              Débloquer ({fields.length}) et prévenir le membre
            </button>
          </div>
        </div>
      )}

      {pieceErreur && <p className="banner banner-error" style={{ marginTop: 8 }}>{pieceErreur}</p>}

      <div className="form-actions" style={{ marginTop: 12, flexWrap: "wrap" }}>
        {detail.statut !== "resolue" && detail.statut !== "refusee" ? (
          <>
            <button type="button" className="btn btn-ghost btn-inline" onClick={() => ouvrirPanneau("piece")}>
              Demander une pièce
            </button>
            <button type="button" className="btn btn-ghost btn-inline" onClick={() => ouvrirPanneau("refusee")}>
              Refuser
            </button>
            <button type="button" className="btn btn-primary btn-inline" onClick={() => ouvrirPanneau("resolue")}>
              Marquer résolu
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-ghost btn-inline" onClick={() => void setStatut("en_cours")}>
            Rouvrir la demande
          </button>
        )}
      </div>

      {action && (
        <div style={{ marginTop: 10, padding: 14, border: "1px solid var(--adsum-line)", borderRadius: 10 }}>
          <p className="card-title" style={{ marginBottom: 4 }}>
            {action === "resolue" ? "Marquer la demande comme résolue" : action === "refusee" ? "Refuser la demande" : "Demander une pièce au membre"}
          </p>
          <p className="muted small" style={{ marginTop: 0 }}>
            {action === "piece"
              ? "Décrivez précisément la pièce attendue : ce texte est envoyé au membre."
              : "Le motif est facultatif. S'il est renseigné, il sera visible par le membre."}
          </p>
          <textarea
            rows={2}
            value={actionTexte}
            autoFocus
            placeholder={action === "piece" ? "Ex. : scan recto-verso de la pièce d'identité, lisible et en couleur" : "Motif (facultatif)"}
            onChange={(e) => setActionTexte(e.target.value)}
            style={{ width: "100%", resize: "vertical", border: "1px solid var(--adsum-line)", borderRadius: 8, padding: "9px 11px", font: "inherit" }}
          />
          {actionErreur && <p className="banner banner-error" style={{ marginTop: 8 }}>{actionErreur}</p>}
          <div className="form-actions" style={{ justifyContent: "flex-start", marginTop: 8 }}>
            <button type="button" className="btn btn-primary btn-inline" disabled={busy} onClick={() => void confirmerAction()}>
              {action === "resolue" ? "Confirmer la résolution" : action === "refusee" ? "Confirmer le refus" : "Envoyer au membre"}
            </button>
            <button type="button" className="btn btn-ghost btn-inline" onClick={() => { setAction(null); setActionTexte(""); setActionErreur(null); }}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
