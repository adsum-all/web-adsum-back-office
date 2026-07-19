import { useEffect, useRef, useState } from "react";

import {
  type CibleReference,
  type Information,
  type InformationInput,
  type InformationPriorite,
  type InformationStats,
  type InformationStatut,
  type MonProfilAuteur,
  apercuDestinataires,
  archiveInformation,
  createInformation,
  deleteInformation,
  exportInformationCSV,
  getCommissions,
  getCoordinations,
  getInformationStats,
  getIntendances,
  getMonProfilAuteur,
  getSousCommissions,
  getTribus,
  publishInformation,
  relanceInformation,
  updateInformation,
  uploadInformationMedia,
} from "../api.js";
import { DiffusionControls } from "./InformationDiffusionControls.js";
import { MembrePicker, RichToolbar, VoiceRecorder, fileToDataUrl } from "./InformationsEditorParts.js";

const PRIO_OPTIONS: { value: InformationPriorite; label: string }[] = [
  { value: "normale", label: "Information normale" },
  { value: "importante", label: "Importante" },
  { value: "urgente", label: "Urgente" },
];

type UniteType = "coordination" | "intendance" | "commission" | "tribu";
const UNITE_LABEL: Record<UniteType, string> = {
  coordination: "Coordination",
  intendance: "Intendance",
  commission: "Commission / Mission",
  tribu: "Tribu",
};

interface UniteRow {
  id: string;
  nom: string;
}

function emptyInput(): InformationInput {
  return { titre: "", sous_titre: "", contenu: "", priorite: "normale", auteur: "", signature: "", signature_url: "", protege: false, institutionnelle: false, canaux: ["application", "telegram"], requiert_accuse: true, lecture_vocale_auto: true, lien_url: "", action_label: "", action_url: "", expire_le: new Date(Date.now() + 24 * 3600 * 1000).toISOString(), cibles: [] };
}


/** Staged media: undefined = untouched, null = clear, string = new data URL. */
type Staged = { audio?: string | null; image?: string | null; document?: string | null };

/** Full-featured editor of one Information: rich text (bold/italic/underline,
 * emojis), a recorded voice note, a cover image and a document, and enriched
 * targeting (broad segments, precise units, manual member selection). Publishing
 * always persists the on-screen form and staged media first. */
export function InformationEditor({
  token,
  info,
  cibles,
  onClose,
  onSaved,
}: Readonly<{ token: string; info: Information | null; cibles: CibleReference[]; onClose: () => void; onSaved: () => void }>): JSX.Element {
  const [form, setForm] = useState<InformationInput>(() =>
    info
      ? { titre: info.titre, sous_titre: info.sous_titre ?? "", contenu: info.contenu, priorite: info.priorite, auteur: info.auteur ?? "", signature: info.signature ?? "", signature_url: info.signature_url ?? "", protege: info.protege, institutionnelle: info.institutionnelle, canaux: info.canaux ?? ["application", "telegram"], requiert_accuse: info.requiert_accuse, lecture_vocale_auto: info.lecture_vocale_auto, lien_url: info.lien_url ?? "", action_label: info.action_label ?? "", action_url: info.action_url ?? "", expire_le: info.expire_le, epingle_jusqu: info.epingle_jusqu, cibles: info.cibles }
      : emptyInput(),
  );
  // Mandatory display duration: pick a preset (which computes expire_le) or a precise date.
  const [duree, setDuree] = useState<string>(info?.expire_le ? "date" : "24h");
  const [id, setId] = useState<string | null>(info?.id ?? null);
  const [statut, setStatut] = useState<InformationStatut>(info?.statut ?? "brouillon");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [apercu, setApercu] = useState<number | null>(null);
  const [stats, setStats] = useState<InformationStats | null>(null);
  const [relanceMsg, setRelanceMsg] = useState<string | null>(null);
  const [staged, setStaged] = useState<Staged>({});
  const [membres, setMembres] = useState<{ id: string; nom: string }[]>(() => {
    const sel = info?.cibles.find((c) => c.code === "selection");
    return (sel?.membre_ids ?? []).map((mid) => ({ id: mid, nom: "Membre sélectionné" }));
  });
  const [uniteType, setUniteType] = useState<UniteType>("coordination");
  const [uniteId, setUniteId] = useState("");
  const [unites, setUnites] = useState<Record<UniteType, UniteRow[]>>({ coordination: [], intendance: [], commission: [], tribu: [] });
  const [sousGroupes, setSousGroupes] = useState<string[]>([]);
  const [profil, setProfil] = useState<MonProfilAuteur | null>(null);
  // True while a voice note is being recorded or encoded: saving would lose it.
  const [mediaBusy, setMediaBusy] = useState(false);
  // Crossed targeting picker: commission + container (intendance/coordination) + sub-group.
  const [crCommission, setCrCommission] = useState("");
  const [crConteneur, setCrConteneur] = useState("");
  const [crGroupe, setCrGroupe] = useState("");
  const contenuRef = useRef<HTMLTextAreaElement>(null);

  const editable = statut === "brouillon" || statut === "programme";

  useEffect(() => {
    if (id && statut === "envoye") void getInformationStats(token, id).then(setStats).catch(() => undefined);
  }, [id, statut, token]);

  // Unit lists for precise targeting, sub-groups and the connected profile (author
  // prefill), loaded once (real referential data).
  useEffect(() => {
    void Promise.all([getCoordinations(token), getIntendances(token), getCommissions(token), getTribus(token)])
      .then(([co, it, cm, tr]) =>
        setUnites({
          coordination: co.map((x) => ({ id: x.id, nom: x.nom })),
          intendance: it.map((x) => ({ id: x.id, nom: x.nom })),
          commission: cm.map((x) => ({ id: x.id, nom: x.nom })),
          tribu: tr.map((x) => ({ id: x.id, nom: x.nom })),
        }),
      )
      .catch(() => undefined);
    void getSousCommissions(token)
      .then((rows) => setSousGroupes([...new Set(rows.map((r) => r.nom))].sort((a, b) => a.localeCompare(b))))
      .catch(() => undefined);
    void getMonProfilAuteur(token).then(setProfil).catch(() => undefined);
  }, [token]);

  const monNom = (profil?.nom_affiche ?? `${profil?.prenoms ?? ""} ${profil?.nom ?? ""}`.trim()) || "";
  const maFonction = (() => {
    const principale = profil?.fonctions?.find((f) => f.principale) ?? profil?.fonctions?.[0];
    const brute = principale?.libelle ?? principale?.cle ?? profil?.fonction_cle ?? "";
    return brute ? brute.replace(/_/g, " ").replace(/^([a-z])/, (m) => m.toUpperCase()) : "";
  })();

  const set = <K extends keyof InformationInput>(k: K, v: InformationInput[K]): void => setForm((f) => ({ ...f, [k]: v }));

  // Keep the single "selection" cible in sync with the picked members.
  useEffect(() => {
    setForm((f) => {
      const sans = f.cibles.filter((c) => c.code !== "selection");
      if (membres.length === 0) return { ...f, cibles: sans };
      return { ...f, cibles: [...sans, { code: "selection", membre_ids: membres.map((m) => m.id), libelle: `${membres.length} membre(s)` }] };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membres]);

  const segments = cibles.filter((c) => c.type_regle === "tous" || c.type_regle === "attribut" || c.type_regle === "fonction");
  const toggleSegment = (code: string): void =>
    setForm((f) => ({ ...f, cibles: f.cibles.some((c) => c.code === code && !c.cible_id) ? f.cibles.filter((c) => !(c.code === code && !c.cible_id)) : [...f.cibles, { code }] }));

  const invalide = !form.titre.trim() || !form.contenu.trim() || form.cibles.length === 0;

  async function run(fn: () => Promise<void>): Promise<void> {
    setBusy(true);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  /** Persist the form, then flush every staged media, returning the row id. */
  async function persister(): Promise<string> {
    let vid = id;
    if (vid) await updateInformation(token, vid, form);
    else {
      const created = await createInformation(token, form);
      vid = created.id;
      setId(created.id);
    }
    for (const kind of ["audio", "image", "document"] as const) {
      const v = staged[kind];
      if (v !== undefined) await uploadInformationMedia(token, vid, kind, v ?? "");
    }
    setStaged({});
    return vid;
  }

  const imageActuelle = staged.image !== undefined ? staged.image : info?.image_url ?? null;
  const documentActuel = staged.document !== undefined ? staged.document : info?.document_url ?? null;
  const audioActuel = staged.audio !== undefined ? staged.audio : info?.audio_url ?? null;

  return (
    <div className="drawer-root" role="dialog" aria-modal="true" aria-label="Éditeur d'information">
      <div className="drawer-overlay" onClick={onClose} aria-hidden="true" />
      <aside className="drawer-panel info-editor">
        <div className="drawer-head">
          <h3>{id ? "Modifier l'information" : "Nouvelle information"}</h3>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Fermer">&times;</button>
        </div>
        <div className="drawer-body">
          <label className="field"><span>Titre *</span><input value={form.titre} onChange={(e) => set("titre", e.target.value)} maxLength={200} disabled={!editable} /></label>
          <label className="field"><span>Sous-titre</span><input value={form.sous_titre ?? ""} onChange={(e) => set("sous_titre", e.target.value)} maxLength={200} disabled={!editable} /></label>
          <label className="field"><span>Niveau de priorité *</span>
            <select value={form.priorite} onChange={(e) => set("priorite", e.target.value as InformationPriorite)} disabled={!editable}>
              {PRIO_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </label>

          <div className="field">
            <span>Contenu *</span>
            {editable && <RichToolbar textareaRef={contenuRef} value={form.contenu} onChange={(v) => set("contenu", v)} />}
            <textarea ref={contenuRef} rows={7} value={form.contenu} onChange={(e) => set("contenu", e.target.value)} maxLength={20000} disabled={!editable} />
            <span className="muted small">Mise en forme: **gras**, *italique*, __souligné__. Les émojis s'insèrent depuis la barre.</span>
          </div>

          <div className="field">
            <span>Auteur / service émetteur</span>
            <input value={form.auteur ?? ""} onChange={(e) => set("auteur", e.target.value)} maxLength={160} disabled={!editable} />
            {editable && (monNom || maFonction) && (
              <div className="info-auteur-btns">
                {monNom && (
                  <button type="button" className="btn btn-ghost btn-inline" onClick={() => set("auteur", monNom)}>Mon nom</button>
                )}
                {maFonction && (
                  <button type="button" className="btn btn-ghost btn-inline" onClick={() => set("auteur", maFonction)}>Ma fonction</button>
                )}
                {monNom && maFonction && (
                  <button type="button" className="btn btn-ghost btn-inline" onClick={() => set("auteur", `${monNom}, ${maFonction}`)}>Nom + fonction</button>
                )}
              </div>
            )}
          </div>


          <div className="field">
            <span>Signature (facultative)</span>
            <input value={form.signature ?? ""} onChange={(e) => set("signature", e.target.value)} maxLength={200} disabled={!editable} placeholder="Ex : La Modératrice" />
            {editable && (
              <div className="info-auteur-btns">
                <button type="button" className="btn btn-ghost btn-inline" onClick={() => set("signature", "La Modératrice")}>La Modératrice</button>
                <button type="button" className="btn btn-ghost btn-inline" onClick={() => set("signature", "Le Fondateur")}>Le Fondateur</button>
                <button type="button" className="btn btn-ghost btn-inline" onClick={() => set("signature", "L'Administration")}>L'Administration</button>
                {monNom && <button type="button" className="btn btn-ghost btn-inline" onClick={() => set("signature", monNom)}>Mon nom</button>}
              </div>
            )}
          </div>
          <label className="field"><span>Lien de signature (site officiel, facultatif)</span><input value={form.signature_url ?? ""} onChange={(e) => set("signature_url", e.target.value)} placeholder="https://sacerdoceroyal.info" disabled={!editable} /></label>
          {editable && (
            <>
              <p className="field-group-title">Note vocale</p>
              <VoiceRecorder existingUrl={audioActuel} onChange={(du) => setStaged((s) => ({ ...s, audio: du }))} onBusyChange={setMediaBusy} />

              <p className="field-group-title">Image de couverture</p>
              {imageActuelle && <img src={imageActuelle} alt="Couverture" className="info-cover-preview" />}
              <div className="info-media-row">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void fileToDataUrl(f).then((du) => setStaged((s) => ({ ...s, image: du }))).catch((x) => setErr(x.message));
                    e.target.value = "";
                  }}
                />
                {imageActuelle && (
                  <button type="button" className="btn btn-danger btn-inline" onClick={() => setStaged((s) => ({ ...s, image: null }))}>Retirer l'image</button>
                )}
              </div>

              <p className="field-group-title">Document joint</p>
              {documentActuel && <p className="muted small">Un document est joint à cette information.</p>}
              <div className="info-media-row">
                <input
                  type="file"
                  accept="application/pdf,.doc,.docx,.xls,.xlsx,text/plain"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void fileToDataUrl(f).then((du) => setStaged((s) => ({ ...s, document: du }))).catch((x) => setErr(x.message));
                    e.target.value = "";
                  }}
                />
                {documentActuel && (
                  <button type="button" className="btn btn-danger btn-inline" onClick={() => setStaged((s) => ({ ...s, document: null }))}>Retirer le document</button>
                )}
              </div>
            </>
          )}

          <p className="field-group-title">Destinataires *</p>
          <div className="info-segments">
            {segments.map((s) => (
              <label key={s.code} className={`info-seg ${form.cibles.some((c) => c.code === s.code && !c.cible_id) ? "is-on" : ""}`}>
                <input type="checkbox" disabled={!editable} checked={form.cibles.some((c) => c.code === s.code && !c.cible_id)} onChange={() => toggleSegment(s.code)} />
                <span>{s.libelle}</span>
              </label>
            ))}
          </div>

          {editable && (
            <>
              <p className="field-group-title">Cibler une unité précise</p>
              <div className="info-unit-row">
                <select value={uniteType} onChange={(e) => { setUniteType(e.target.value as UniteType); setUniteId(""); }} aria-label="Type d'unité">
                  {(Object.keys(UNITE_LABEL) as UniteType[]).map((u) => <option key={u} value={u}>{UNITE_LABEL[u]}</option>)}
                </select>
                <select value={uniteId} onChange={(e) => setUniteId(e.target.value)} aria-label="Unité">
                  <option value="">Choisir...</option>
                  {unites[uniteType].map((u) => <option key={u.id} value={u.id}>{u.nom}</option>)}
                </select>
                <button
                  type="button"
                  className="btn btn-ghost btn-inline"
                  disabled={!uniteId || form.cibles.some((c) => c.code === uniteType && c.cible_id === uniteId)}
                  onClick={() => {
                    const nom = unites[uniteType].find((u) => u.id === uniteId)?.nom ?? "";
                    setForm((f) => ({ ...f, cibles: [...f.cibles, { code: uniteType, cible_id: uniteId, libelle: `${UNITE_LABEL[uniteType]}: ${nom}` }] }));
                    setUniteId("");
                  }}
                >
                  Ajouter
                </button>
              </div>
              {form.cibles.some((c) => c.cible_id) && (
                <div className="mp-chips">
                  {form.cibles.filter((c) => c.cible_id).map((c) => (
                    <span key={`${c.code}:${c.cible_id}`} className="mp-chip">
                      {c.libelle ?? `${c.code}`}
                      <button type="button" aria-label="Retirer cette unité" onClick={() => setForm((f) => ({ ...f, cibles: f.cibles.filter((x) => !(x.code === c.code && x.cible_id === c.cible_id)) }))}>&times;</button>
                    </span>
                  ))}
                </div>
              )}

              <p className="field-group-title">Ciblage croisé (au plus fin)</p>
              <p className="muted small">
                Visez une commission À L'INTÉRIEUR d'une coordination ou d'une intendance, ou un sous-groupe précis.
                Tous les critères choisis se cumulent.
              </p>
              <div className="info-unit-row">
                <select value={crCommission} onChange={(e) => setCrCommission(e.target.value)} aria-label="Commission du croisement">
                  <option value="">Commission: choisir...</option>
                  {unites.commission.map((u) => <option key={u.id} value={u.id}>{u.nom}</option>)}
                </select>
                <select value={crConteneur} onChange={(e) => setCrConteneur(e.target.value)} aria-label="Coordination ou intendance du croisement">
                  <option value="">Coordination / intendance: choisir...</option>
                  <optgroup label="Dans l'intendance">
                    {unites.intendance.map((u) => <option key={`i-${u.id}`} value={`i:${u.id}`}>{u.nom}</option>)}
                  </optgroup>
                  <optgroup label="Dans la coordination">
                    {unites.coordination.map((u) => <option key={`c-${u.id}`} value={`c:${u.id}`}>{u.nom}</option>)}
                  </optgroup>
                </select>
                <select value={crGroupe} onChange={(e) => setCrGroupe(e.target.value)} aria-label="Sous-groupe du croisement">
                  <option value="">Sous-groupe: choisir...</option>
                  {sousGroupes.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                <button
                  type="button"
                  className="btn btn-ghost btn-inline"
                  disabled={!crCommission && !crConteneur && !crGroupe}
                  onClick={() => {
                    const croisement: { commission_id?: string; intendance_id?: string; coordination_id?: string; groupe?: string } = {};
                    const morceaux: string[] = [];
                    if (crCommission) {
                      croisement.commission_id = crCommission;
                      morceaux.push(unites.commission.find((u) => u.id === crCommission)?.nom ?? "Commission");
                    }
                    if (crConteneur.startsWith("i:")) {
                      croisement.intendance_id = crConteneur.slice(2);
                      morceaux.push(`dans ${unites.intendance.find((u) => u.id === crConteneur.slice(2))?.nom ?? "l'intendance"}`);
                    }
                    if (crConteneur.startsWith("c:")) {
                      croisement.coordination_id = crConteneur.slice(2);
                      morceaux.push(`dans ${unites.coordination.find((u) => u.id === crConteneur.slice(2))?.nom ?? "la coordination"}`);
                    }
                    if (crGroupe) {
                      croisement.groupe = crGroupe;
                      morceaux.push(`groupe ${crGroupe}`);
                    }
                    setForm((f) => ({ ...f, cibles: [...f.cibles, { code: "croisement", croisement, libelle: morceaux.join(" ") }] }));
                    setCrCommission("");
                    setCrConteneur("");
                    setCrGroupe("");
                  }}
                >
                  Ajouter
                </button>
              </div>
              {form.cibles.some((c) => c.code === "croisement") && (
                <div className="mp-chips">
                  {form.cibles.filter((c) => c.code === "croisement").map((c, idx) => (
                    <span key={`cr-${c.libelle ?? idx}`} className="mp-chip">
                      {c.libelle ?? "Ciblage croisé"}
                      <button type="button" aria-label="Retirer ce croisement" onClick={() => setForm((f) => ({ ...f, cibles: f.cibles.filter((x) => x !== c) }))}>&times;</button>
                    </span>
                  ))}
                </div>
              )}

              <p className="field-group-title">Sélection manuelle de membres</p>
              <MembrePicker token={token} selection={membres} onChange={setMembres} />
            </>
          )}

          <DiffusionControls
            editable={editable}
            expireLe={form.expire_le ?? undefined}
            duree={duree}
            onDuree={setDuree}
            onExpire={(iso) => set("expire_le", iso)}
            canaux={form.canaux ?? []}
            onCanaux={(next) => set("canaux", next)}
          />

          <label className="field-check"><input type="checkbox" disabled={!editable} checked={!!form.requiert_accuse} onChange={(e) => set("requiert_accuse", e.target.checked)} /><span>Demander une confirmation de lecture</span></label>
          <label className="field-check"><input type="checkbox" disabled={!editable} checked={form.lecture_vocale_auto !== false} onChange={(e) => set("lecture_vocale_auto", e.target.checked)} /><span>Autoriser la lecture vocale du texte</span></label>
          <label className="field-check"><input type="checkbox" disabled={!editable} checked={!!form.protege} onChange={(e) => set("protege", e.target.checked)} /><span>Conservation protégée (jamais archivée ni supprimée automatiquement)</span></label>
          <label className="field-check"><input type="checkbox" disabled={!editable} checked={!!form.institutionnelle} onChange={(e) => set("institutionnelle", e.target.checked)} /><span>Information institutionnelle (conservée durablement)</span></label>

          <label className="field"><span>Lien externe (facultatif)</span><input value={form.lien_url ?? ""} onChange={(e) => set("lien_url", e.target.value)} placeholder="https://..." disabled={!editable} /></label>
          <div className="info-two">
            <label className="field"><span>Bouton d'action (libellé)</span><input value={form.action_label ?? ""} onChange={(e) => set("action_label", e.target.value)} maxLength={80} disabled={!editable} /></label>
            <label className="field"><span>Bouton d'action (URL)</span><input value={form.action_url ?? ""} onChange={(e) => set("action_url", e.target.value)} placeholder="https://..." disabled={!editable} /></label>
          </div>

          {apercu !== null && <p className="banner banner-info">{apercu} destinataire(s) unique(s) pour ce ciblage.</p>}
          {stats && (
            <div className="info-stats">
              <p className="field-group-title">Suivi de diffusion</p>
              <div className="info-stats-grid">
                <div><b>{stats.destinataires}</b><span>Destinataires</span></div>
                <div><b>{stats.lus}</b><span>Lus ({stats.taux_lecture}%)</span></div>
                <div><b>{stats.confirmes}</b><span>Confirmés ({stats.taux_confirmation}%)</span></div>
                <div><b>{stats.non_lus}</b><span>Non lus</span></div>
              </div>
              {id && statut === "envoye" && (
                <div className="info-suivi-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-inline"
                    disabled={busy}
                    onClick={() => void run(async () => { if (id) await exportInformationCSV(token, id); })}
                  >
                    Exporter le suivi (CSV)
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-inline"
                    disabled={busy || stats.non_lus === 0}
                    title={stats.non_lus === 0 ? "Tous les destinataires ont lu cette information." : "Renvoyer l'information sur ses canaux, uniquement aux personnes qui ne l'ont pas encore lue."}
                    onClick={() => void run(async () => {
                      if (!id) return;
                      if (!window.confirm("Relancer les destinataires qui n'ont pas encore lu cette information ? Les personnes qui l'ont déjà lue ne sont pas notifiées.")) return;
                      const r = await relanceInformation(token, id);
                      setRelanceMsg(`Relance envoyée à ${r.non_lus} destinataire(s) non lus (Telegram : ${r.telegram.envoyes}, e-mail : ${r.email.envoyes}).`);
                      setStats(await getInformationStats(token, id));
                    })}
                  >
                    Relancer les non-lus
                  </button>
                </div>
              )}
              {relanceMsg && <p className="banner banner-info">{relanceMsg}</p>}
            </div>
          )}
          {err && <p className="banner banner-error">{err}</p>}
        </div>
        <div className="drawer-foot info-editor-foot">
          {editable && (
            <>
              <button type="button" className="btn btn-ghost btn-inline" disabled={busy || mediaBusy || invalide} title={mediaBusy ? "Terminez d'abord la note vocale" : undefined} onClick={() => void run(async () => { await persister(); onSaved(); })}>Enregistrer</button>
              <button type="button" className="btn btn-ghost btn-inline" disabled={busy || mediaBusy || invalide} onClick={() => void run(async () => { const vid = await persister(); setApercu((await apercuDestinataires(token, vid)).destinataires_uniques); })}>Aperçu destinataires</button>
              <button
                type="button"
                className="btn btn-primary btn-inline"
                disabled={busy || mediaBusy || invalide || !form.expire_le}
                title={!form.expire_le ? "Choisissez d'abord une durée d'affichage" : undefined}
                onClick={() => void run(async () => {
                  if (!window.confirm("Publier et diffuser cette information aux destinataires ?")) return;
                  const vid = await persister();
                  const r = await publishInformation(token, vid);
                  setStatut("envoye");
                  setApercu(r.destinataires);
                  onSaved();
                })}
              >
                Publier
              </button>
              {id && (
                <button type="button" className="btn btn-danger btn-inline" disabled={busy} onClick={() => void run(async () => { if (id && window.confirm("Supprimer ce brouillon ?")) { await deleteInformation(token, id); onSaved(); onClose(); } })}>Supprimer</button>
              )}
            </>
          )}
          {statut === "envoye" && (
            <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => void run(async () => { if (id) { await archiveInformation(token, id); setStatut("archive"); onSaved(); } })}>Archiver</button>
          )}
        </div>
      </aside>
    </div>
  );
}
