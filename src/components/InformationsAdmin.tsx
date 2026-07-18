import { useEffect, useMemo, useState } from "react";

import {
  type CibleReference,
  type Information,
  type InformationInput,
  type InformationPriorite,
  type InformationStatut,
  type InformationStats,
  apercuDestinataires,
  archiveInformation,
  createInformation,
  deleteInformation,
  getCiblesReference,
  getInformationStats,
  listInformations,
  publishInformation,
  updateInformation,
} from "../api.js";
import { useResource } from "../useResource.js";

const PRIO: { value: InformationPriorite; label: string; cls: string }[] = [
  { value: "normale", label: "INFO", cls: "info-badge-info" },
  { value: "importante", label: "IMPORTANT", cls: "info-badge-important" },
  { value: "urgente", label: "URGENT", cls: "info-badge-urgent" },
];
function prioMeta(p: InformationPriorite): { label: string; cls: string } {
  return PRIO.find((x) => x.value === p) ?? { label: "INFO", cls: "info-badge-info" };
}

const STATUT_LABEL: Record<InformationStatut, string> = {
  brouillon: "Brouillon",
  programme: "Programmé",
  envoye: "Envoyé",
  archive: "Archivé",
};

function emptyInput(): InformationInput {
  return { titre: "", sous_titre: "", contenu: "", priorite: "normale", auteur: "", requiert_accuse: false, lecture_vocale_auto: true, lien_url: "", action_label: "", action_url: "", cibles: [] };
}

/** Editor + delivery view of one Information. A draft is written, its recipients
 * previewed (deduplicated count) and then published; a sent Information shows the
 * read/confirm dashboard and can be archived. */
function Editor({
  token,
  info,
  cibles,
  onClose,
  onSaved,
}: Readonly<{ token: string; info: Information | null; cibles: CibleReference[]; onClose: () => void; onSaved: () => void }>): JSX.Element {
  const [form, setForm] = useState<InformationInput>(() =>
    info
      ? { titre: info.titre, sous_titre: info.sous_titre ?? "", contenu: info.contenu, priorite: info.priorite, auteur: info.auteur ?? "", requiert_accuse: info.requiert_accuse, lecture_vocale_auto: info.lecture_vocale_auto, lien_url: info.lien_url ?? "", action_label: info.action_label ?? "", action_url: info.action_url ?? "", expire_le: info.expire_le, epingle_jusqu: info.epingle_jusqu, cibles: info.cibles }
      : emptyInput(),
  );
  const [id, setId] = useState<string | null>(info?.id ?? null);
  const [statut, setStatut] = useState<InformationStatut>(info?.statut ?? "brouillon");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [apercu, setApercu] = useState<number | null>(null);
  const [stats, setStats] = useState<InformationStats | null>(null);

  useEffect(() => {
    if (id && statut === "envoye") void getInformationStats(token, id).then(setStats).catch(() => undefined);
  }, [id, statut, token]);

  const set = <K extends keyof InformationInput>(k: K, v: InformationInput[K]): void => setForm((f) => ({ ...f, [k]: v }));
  const toggleCible = (code: string): void =>
    setForm((f) => ({ ...f, cibles: f.cibles.some((c) => c.code === code) ? f.cibles.filter((c) => c.code !== code) : [...f.cibles, { code }] }));

  // Only segments that need no specific unit id are offered here (all members,
  // bergers, responsables, patriarches). Unit-specific targeting comes next.
  const segments = cibles.filter((c) => c.type_regle === "tous" || c.type_regle === "attribut" || c.type_regle === "fonction");
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

  async function enregistrer(): Promise<void> {
    await run(async () => {
      if (id) {
        await updateInformation(token, id, form);
      } else {
        const created = await createInformation(token, form);
        setId(created.id);
      }
      setApercu(null);
    });
  }

  return (
    <div className="drawer-root" role="dialog" aria-modal="true" aria-label="Éditeur d'information">
      <div className="drawer-overlay" onClick={onClose} aria-hidden="true" />
      <aside className="drawer-panel info-editor">
        <div className="drawer-head">
          <h3>{id ? "Modifier l'information" : "Nouvelle information"}</h3>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Fermer">&times;</button>
        </div>
        <div className="drawer-body">
          <label className="field"><span>Titre *</span><input value={form.titre} onChange={(e) => set("titre", e.target.value)} maxLength={200} /></label>
          <label className="field"><span>Sous-titre</span><input value={form.sous_titre ?? ""} onChange={(e) => set("sous_titre", e.target.value)} maxLength={200} /></label>
          <label className="field"><span>Niveau de priorité *</span>
            <select value={form.priorite} onChange={(e) => set("priorite", e.target.value as InformationPriorite)}>
              {PRIO.map((p) => <option key={p.value} value={p.value}>{p.label === "INFO" ? "Information normale" : p.label === "IMPORTANT" ? "Importante" : "Urgente"}</option>)}
            </select>
          </label>
          <label className="field"><span>Contenu *</span><textarea rows={6} value={form.contenu} onChange={(e) => set("contenu", e.target.value)} maxLength={20000} /></label>
          <label className="field"><span>Auteur / service émetteur</span><input value={form.auteur ?? ""} onChange={(e) => set("auteur", e.target.value)} maxLength={160} /></label>

          <p className="field-group-title">Destinataires *</p>
          <div className="info-segments">
            {segments.map((s) => (
              <label key={s.code} className={`info-seg ${form.cibles.some((c) => c.code === s.code) ? "is-on" : ""}`}>
                <input type="checkbox" checked={form.cibles.some((c) => c.code === s.code)} onChange={() => toggleCible(s.code)} />
                <span>{s.libelle}</span>
              </label>
            ))}
          </div>
          <p className="muted small">Le ciblage par coordination, intendance, commission ou tribu précise arrive prochainement.</p>

          <label className="field-check"><input type="checkbox" checked={!!form.requiert_accuse} onChange={(e) => set("requiert_accuse", e.target.checked)} /><span>Demander une confirmation de lecture</span></label>
          <label className="field-check"><input type="checkbox" checked={form.lecture_vocale_auto !== false} onChange={(e) => set("lecture_vocale_auto", e.target.checked)} /><span>Autoriser la lecture vocale du texte</span></label>

          <label className="field"><span>Lien externe (facultatif)</span><input value={form.lien_url ?? ""} onChange={(e) => set("lien_url", e.target.value)} placeholder="https://..." /></label>
          <div className="info-two">
            <label className="field"><span>Bouton d'action (libellé)</span><input value={form.action_label ?? ""} onChange={(e) => set("action_label", e.target.value)} maxLength={80} /></label>
            <label className="field"><span>Bouton d'action (URL)</span><input value={form.action_url ?? ""} onChange={(e) => set("action_url", e.target.value)} placeholder="https://..." /></label>
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
            </div>
          )}
          {err && <p className="banner banner-error">{err}</p>}
        </div>
        <div className="drawer-foot info-editor-foot">
          {statut !== "envoye" && statut !== "archive" && (
            <>
              <button type="button" className="btn btn-ghost btn-inline" disabled={busy || invalide} onClick={() => void enregistrer()}>Enregistrer</button>
              <button type="button" className="btn btn-ghost btn-inline" disabled={busy || !id} onClick={() => void run(async () => { if (id) setApercu((await apercuDestinataires(token, id)).destinataires_uniques); })}>Aperçu destinataires</button>
              <button type="button" className="btn btn-primary btn-inline" disabled={busy || !id || invalide}
                onClick={() => void run(async () => { if (!id) return; if (!window.confirm("Publier et diffuser cette information aux destinataires ?")) return; const r = await publishInformation(token, id); setStatut("envoye"); setApercu(r.destinataires); onSaved(); })}>
                Publier
              </button>
            </>
          )}
          {statut === "envoye" && (
            <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => void run(async () => { if (id) { await archiveInformation(token, id); setStatut("archive"); onSaved(); } })}>Archiver</button>
          )}
          {id && statut !== "envoye" && (
            <button type="button" className="btn btn-danger btn-inline" disabled={busy} onClick={() => void run(async () => { if (id && window.confirm("Supprimer ce brouillon ?")) { await deleteInformation(token, id); onSaved(); onClose(); } })}>Supprimer</button>
          )}
        </div>
      </aside>
    </div>
  );
}

const FILTRES: { id: InformationStatut | "toutes"; label: string }[] = [
  { id: "toutes", label: "Toutes" },
  { id: "brouillon", label: "Brouillons" },
  { id: "envoye", label: "Envoyées" },
  { id: "archive", label: "Archivées" },
];

export function InformationsAdmin({ token }: Readonly<{ token: string }>): JSX.Element {
  const [filtre, setFiltre] = useState<InformationStatut | "toutes">("toutes");
  const [rev, setRev] = useState(0);
  const [editing, setEditing] = useState<Information | null | "new">(null);
  const liste = useResource(() => listInformations(token, filtre === "toutes" ? undefined : filtre), [token, filtre, rev]);
  const cibles = useResource(() => getCiblesReference(token), [token]);
  const reload = (): void => setRev((r) => r + 1);
  const items = useMemo(() => liste.data ?? [], [liste.data]);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Informations importantes</h1>
          <p className="muted">Diffusez des communications institutionnelles aux membres, ciblées et suivies (envoyé, lu, confirmé).</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setEditing("new")}>+ Nouvelle information</button>
      </header>

      <div className="info-filtres">
        {FILTRES.map((f) => (
          <button key={f.id} type="button" className={`chip ${filtre === f.id ? "chip-active" : ""}`} onClick={() => setFiltre(f.id)}>{f.label}</button>
        ))}
      </div>

      {liste.loading ? (
        <p className="muted">Chargement...</p>
      ) : items.length === 0 ? (
        <div className="empty-card"><p>Aucune information pour ce filtre.</p></div>
      ) : (
        <ul className="info-list">
          {items.map((i) => {
            const m = prioMeta(i.priorite);
            return (
              <li key={i.id} className="info-row" onClick={() => setEditing(i)}>
                <span className={`info-badge ${m.cls}`}>{m.label}</span>
                <div className="info-row-main">
                  <strong>{i.titre}</strong>
                  <span className="muted small">{[i.auteur, STATUT_LABEL[i.statut], i.envoye_le ? new Date(i.envoye_le).toLocaleString("fr-FR") : new Date(i.cree_le ?? "").toLocaleDateString("fr-FR")].filter(Boolean).join(" · ")}</span>
                </div>
                <span className={`info-statut info-statut-${i.statut}`}>{STATUT_LABEL[i.statut]}</span>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <Editor
          token={token}
          info={editing === "new" ? null : editing}
          cibles={cibles.data ?? []}
          onClose={() => setEditing(null)}
          onSaved={reload}
        />
      )}
    </div>
  );
}
