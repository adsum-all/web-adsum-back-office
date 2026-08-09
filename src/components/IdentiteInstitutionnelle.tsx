import { useEffect, useState } from "react";

import {
  type IdentiteInstitutionnelle as Identite,
  type ReferenceCouleur,
  getIdentiteInstitutionnelle,
  getReferenceCouleurs,
  setIdentiteInstitutionnelle,
} from "../api.js";
import { ReglagesDurees } from "./ReglagesDurees.js";
import { RichEditor } from "./RichEditor.js";
import "./institutionnel/institutionnel.css";
import { Aide } from "./institutionnel/Aide.js";
import { FuseauSelect } from "./institutionnel/FuseauSelect.js";
import { InstitApercuTab } from "./institutionnel/InstitApercuTab.js";
import { InstitApparenceTab } from "./institutionnel/InstitApparenceTab.js";
import { InstitDatesTab } from "./institutionnel/InstitDatesTab.js";
import { InstitLiturgieTab } from "./institutionnel/InstitLiturgieTab.js";

/**
 * SYSTEME > Identité, dates et calendrier institutionnel.
 *
 * A durable configuration centre, not an activity form: the organisation identity,
 * its commemorative dates and the catholic liturgical calendar, all editable as data
 * (never hardcoded) and surfaced automatically in the member calendar. Organised in
 * tabs so identity, institutional dates and church feasts never blur together.
 */
type Onglet = "identite" | "apparence" | "durees" | "dates" | "liturgie" | "apercu";

const PRINCIPALE: { key: string; label: string; placeholder?: string; type?: string }[] = [
  { key: "org_nom", label: "Nom officiel de l'organisation" },
  { key: "org_nom_court", label: "Nom court" },
  { key: "org_acronyme", label: "Acronyme" },
  { key: "org_slogan", label: "Slogan ou devise" },
  { key: "org_signature", label: "Signature institutionnelle" },
  { key: "org_site", label: "Site ou portail officiel", placeholder: "https://..." },
  { key: "org_email", label: "E-mail officiel", type: "email" },
  { key: "org_telephone", label: "Téléphone officiel" },
  { key: "org_whatsapp", label: "WhatsApp officiel" },
  { key: "org_adresse", label: "Adresse ou siège" },
  { key: "org_pays", label: "Pays principal" },
  { key: "org_ville", label: "Ville principale" },
  { key: "org_langue", label: "Langue principale" },
  { key: "org_logo_url", label: "Logo (URL)", placeholder: "https://..." },
  { key: "org_banniere_url", label: "Bannière (URL)", placeholder: "https://..." },
  { key: "org_reseaux", label: "Réseaux sociaux (texte libre)" },
];
const ORIGINE: { key: string; label: string; type?: string }[] = [
  { key: "org_fondation_date", label: "Date de fondation", type: "date" },
  { key: "org_fondation_lieu", label: "Lieu de fondation" },
  { key: "org_fondateur_nom", label: "Fondateur ou fondatrice" },
  { key: "org_fondateur_type", label: "Rôle du fondateur (facultatif)" },
  { key: "org_saint_patron", label: "Saint patron ou sainte patronne" },
  { key: "org_saint_patron_date", label: "Date de la fête du saint patron", type: "date" },
  { key: "org_source_validee", label: "Source institutionnelle validée" },
];
const RICHES: { key: string; label: string }[] = [
  { key: "org_description_longue", label: "Présentation institutionnelle" },
  { key: "org_mission", label: "Mission" },
  { key: "org_vision", label: "Vision" },
  { key: "org_valeurs", label: "Valeurs" },
  { key: "org_texte_historique", label: "Texte historique (source validée uniquement)" },
];

const ONGLETS: { id: Onglet; label: string }[] = [
  { id: "identite", label: "Identité de l'organisation" },
  { id: "apparence", label: "Apparence" },
  { id: "durees", label: "Durées et sessions" },
  { id: "dates", label: "Dates de l'organisation" },
  { id: "liturgie", label: "Calendrier catholique" },
  { id: "apercu", label: "Aperçu calendrier" },
];

export function IdentiteInstitutionnelle({ token, canGerer }: Readonly<{ token: string; canGerer: boolean }>): JSX.Element {
  const [onglet, setOnglet] = useState<Onglet>("identite");
  const [identite, setIdentite] = useState<Identite | null>(null);
  const [couleurs, setCouleurs] = useState<ReferenceCouleur[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getIdentiteInstitutionnelle(token).then(setIdentite).catch((e) => setErr(String(e?.message ?? e)));
    void getReferenceCouleurs(token).then(setCouleurs).catch(() => undefined);
  }, [token]);

  const setChamp = (key: string, val: string): void => setIdentite((id) => (id ? { ...id, [key]: val } : id));

  async function enregistrer(): Promise<void> {
    if (!identite) return;
    setBusy(true); setErr(null); setMsg(null);
    try { await setIdentiteInstitutionnelle(token, identite); setMsg("Identité enregistrée."); }
    catch (e) { setErr(e instanceof Error ? e.message : "Erreur"); } finally { setBusy(false); }
  }

  if (!identite) {
    return (
      <div className="page">
        <header className="page-head"><h1>Identité, dates et calendrier institutionnel</h1></header>
        <section className="card"><p className="muted">{err ?? "Chargement..."}</p></section>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>Identité, dates et calendrier institutionnel</h1>
        <p className="muted">Configurez l'identité officielle de l'organisation, ses dates de référence et les repères liturgiques affichés automatiquement dans le calendrier.</p>
      </header>

      <div className="card" style={{ background: "var(--adsum-bg-soft, #f4f6fb)", borderLeft: "4px solid var(--adsum-acc, #2a4fad)" }}>
        <strong>À quoi sert cette page ?</strong>
        <p className="muted" style={{ margin: "6px 0 0" }}>
          Ces informations permanentes personnalisent l'application, les communications et le calendrier des membres.
          Les dates institutionnelles et liturgiques ne sont pas des activités : elles n'ouvrent ni pointage, ni sondage,
          ni contrôle d'accès, et se répètent automatiquement chaque année.
        </p>
      </div>

      <div className="inst-tabs" role="tablist" aria-label="Sections">
        {ONGLETS.map((o) => (
          <button key={o.id} type="button" role="tab" aria-selected={onglet === o.id} className={`inst-tab ${onglet === o.id ? "is-active" : ""}`} onClick={() => setOnglet(o.id)}>
            {o.label}
          </button>
        ))}
      </div>

      {err && <div className="banner-error">{err}</div>}
      {msg && <div className="banner-info">{msg}</div>}

      {onglet === "identite" && (
        <section className="card">
          <h2>Identité principale</h2>
          <div className="grid-2">
            {PRINCIPALE.map((c) => (
              <label key={c.key} className="field">
                <span>{c.label}</span>
                <input type={c.type ?? "text"} value={identite[c.key] ?? ""} placeholder={c.placeholder} disabled={!canGerer} onChange={(e) => setChamp(c.key, e.target.value)} />
              </label>
            ))}
            <label className="field">
              <span>Fuseau de référence<Aide texte="Fuseau utilisé par les publications automatiques et le calendrier institutionnel. Les membres voient ensuite les heures converties dans leur fuseau local." /></span>
              <FuseauSelect value={identite.org_fuseau ?? ""} disabled={!canGerer} onChange={(tz) => setChamp("org_fuseau", tz)} />
            </label>
          </div>

          <label className="field" style={{ marginTop: 10 }}><span>Description courte</span>
            <textarea value={identite.org_description_courte ?? ""} disabled={!canGerer} onChange={(e) => setChamp("org_description_courte", e.target.value)} maxLength={400} />
          </label>

          {RICHES.map((r) => (
            <div key={r.key} style={{ marginTop: 12 }}>
              <label className="field"><span>{r.label}</span></label>
              <RichEditor value={identite[r.key] ?? ""} onChange={(html) => setChamp(r.key, html)} disabled={!canGerer} />
            </div>
          ))}

          <h2 style={{ marginTop: 20 }}>Statut et origine</h2>
          <div className="grid-2">
            {ORIGINE.map((c) => (
              <label key={c.key} className="field">
                <span>{c.label}</span>
                <input type={c.type ?? "text"} value={identite[c.key] ?? ""} disabled={!canGerer} onChange={(e) => setChamp(c.key, e.target.value)} />
              </label>
            ))}
          </div>

          {canGerer && (
            <div className="row-actions" style={{ marginTop: 14 }}>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void enregistrer()}>{busy ? "Enregistrement…" : "Enregistrer l'identité"}</button>
            </div>
          )}
        </section>
      )}

      {onglet === "apparence" && <InstitApparenceTab token={token} canGerer={canGerer} />}
      {onglet === "durees" && <ReglagesDurees token={token} canGerer={canGerer} />}
      {onglet === "dates" && <section className="card"><h2>Dates de l'organisation</h2><InstitDatesTab token={token} canGerer={canGerer} couleurs={couleurs} /></section>}
      {onglet === "liturgie" && <section className="card"><h2>Calendrier catholique</h2><InstitLiturgieTab token={token} canGerer={canGerer} couleurs={couleurs} /></section>}
      {onglet === "apercu" && <section className="card"><h2>Aperçu du calendrier</h2><InstitApercuTab token={token} couleurs={couleurs} /></section>}
    </div>
  );
}
