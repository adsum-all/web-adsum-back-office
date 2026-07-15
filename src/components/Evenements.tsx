import { useState } from "react";

import {
  ApiError,
  type CibleType,
  type EvenementCreateInput,
  ajouterPieceEvenement,
  createEvenement,
  getCommissions,
  getCoordinations,
  getEvenements,
  getIntendances,
  getQuestionnaireFenetre,
  getSemaineJourDebut,
  getTribus,
  getTypesEvenements,
  setQuestionnaireFenetre,
  setSemaineJourDebut,
} from "../api.js";
import { formatDate } from "../format.js";
import { FUSEAUX } from "../lib/fuseaux.js";
import { zonedToUtc } from "../lib/tz.js";
import { useResource } from "../useResource.js";
import { CalendrierEvenements } from "./CalendrierEvenements.js";
import { EvenementGestion } from "./EvenementGestion.js";
import { PiecesACharger } from "./PiecesACharger.js";
import { lireFichier } from "./PiecesEvenement.js";
import { InfoTip } from "./InfoTip.js";
import { LiensEditor } from "./LiensEditor.js";
import { RichEditor } from "./RichEditor.js";

const EMPTY: EvenementCreateInput = {
  titre: "",
  volet: "A",
  debut: "",
  type: "rassemblement",
  mode: "presentiel",
  type_diffusion: "aucun",
  visibilite: "membres",
  cible_type: "general",
  cible_id: null,
  fuseau_horaire: "Africa/Abidjan",
};

const CIBLE_LABELS: Record<CibleType, string> = {
  general: "Toute la communauté (général)",
  coordination: "Coordination",
  commission: "Commission / Mission",
  intendance: "Intendance",
  tribu: "Tribu",
  bergers: "Les Bergers",
  responsables: "Les responsables (avec fonction)",
  liste: "Liste d'adresses e-mail (groupe ad hoc)",
};

// Target types that need an organisational unit selected (a second dropdown).
const CIBLE_UNITES: CibleType[] = ["coordination", "commission", "intendance", "tribu"];

type Repetition = "aucune" | "quotidienne" | "hebdomadaire" | "dates_precises";
type DatePrecise = { debut: string; mode: string };

/** Add whole days to a naive "YYYY-MM-DDTHH:mm", keeping the same wall-clock time
 * (so a daily 21:00 series stays at 21:00 every day, across month boundaries). */
function addDaysLocal(local: string, days: number): string {
  const [d = "", t = "00:00"] = local.split("T");
  const [y = 0, mo = 1, da = 1] = d.split("-").map(Number);
  const [h = 0, mi = 0] = t.split(":").map(Number);
  const dt = new Date(y, mo - 1, da + days, h, mi);
  const p = (n: number): string => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}T${p(dt.getHours())}:${p(dt.getMinutes())}`;
}

export function Evenements({ token }: { token: string }): JSX.Element {
  const evenements = useResource(() => getEvenements(token), [token]);
  const fenetre = useResource(() => getQuestionnaireFenetre(token), [token]);
  const semaineDebut = useResource(() => getSemaineJourDebut(token), [token]);
  // Units available as an activity target. Loaded once; the second select only
  // shows the list matching the chosen target kind.
  const coordinations = useResource(() => getCoordinations(token), [token]);
  const commissions = useResource(() => getCommissions(token), [token]);
  const intendances = useResource(() => getIntendances(token), [token]);
  const tribus = useResource(() => getTribus(token), [token]);
  const [form, setForm] = useState<EvenementCreateInput>(EMPTY);
  const [piecesAJoindre, setPiecesAJoindre] = useState<File[]>([]);
  const typesEvenements = useResource(() => getTypesEvenements(token), [token]);
  const typesPublies = (typesEvenements.data ?? []).filter((t) => t.publie);
  const typeCouleur = typesPublies.find((t) => t.id === form.type_evenement_id)?.couleur ?? null;
  const [liens, setLiens] = useState<string[]>([""]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  // Two page tabs so the page is never one long scroll: the calendar (view and
  // manage) and the creation form (data entry).
  const [ongletPage, setOngletPage] = useState<"calendrier" | "saisie">("calendrier");
  // Month calendar is the primary view; the flat list stays available as a fallback.
  const [vue, setVue] = useState<"calendrier" | "liste">("calendrier");
  // Recurrence: how the activity repeats and over how many dates (1 = single).
  const [repetition, setRepetition] = useState<Repetition>("aucune");
  const [nbOccurrences, setNbOccurrences] = useState(1);
  // Explicit intermittent dates (each an extra occurrence with its own mode).
  const [datesPrecises, setDatesPrecises] = useState<DatePrecise[]>([]);
  // Ad-hoc e-mail list (one per line / comma) for a 'liste' target.
  const [emailsTexte, setEmailsTexte] = useState("");
  // Local value of the questionnaire-window slider while it is being dragged, so
  // the position is persisted only once, on release, not on every tick (which
  // would flood the API and the audit log).
  const [fenetreLocal, setFenetreLocal] = useState<number | null>(null);
  const fenetreValue = fenetreLocal ?? fenetre.data?.heures ?? 6;

  function saveFenetre(heures: number): void {
    setFenetreLocal(null);
    void setQuestionnaireFenetre(token, heures).then(() => fenetre.reload()).catch(() => undefined);
  }

  function saveSemaineDebut(jour: number): void {
    void setSemaineJourDebut(token, jour).then(() => semaineDebut.reload()).catch(() => undefined);
  }

  function set<K extends keyof EvenementCreateInput>(key: K, value: EvenementCreateInput[K]): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Units matching the chosen target kind, for the second select.
  const cibleOptions: { id: string; nom: string }[] =
    form.cible_type === "coordination"
      ? (coordinations.data ?? [])
      : form.cible_type === "commission"
        ? (commissions.data ?? [])
        : form.cible_type === "intendance"
          ? (intendances.data ?? [])
          : form.cible_type === "tribu"
            ? (tribus.data ?? [])
            : [];

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!form.titre.trim() || !form.debut) return;
    setBusy(true);
    setError(null);
    try {
      const cibleType = form.cible_type ?? "general";
      if (CIBLE_UNITES.includes(cibleType) && !form.cible_id) {
        setError("Choisissez l'unité ciblée ou repassez sur « général ».");
        setBusy(false);
        return;
      }
      const emails = cibleType === "liste"
        ? emailsTexte.split(/[\n,;]+/).map((x) => x.trim().toLowerCase()).filter(Boolean)
        : [];
      if (cibleType === "liste" && emails.length === 0) {
        setError("Ajoutez au moins une adresse e-mail pour un ciblage par liste.");
        setBusy(false);
        return;
      }
      if (form.cible_age_min != null && form.cible_age_max != null && form.cible_age_min > form.cible_age_max) {
        setError("La tranche d'âge est incohérente (âge minimum supérieur à l'âge maximum).");
        setBusy(false);
        return;
      }
      const zone = form.fuseau_horaire ?? "Africa/Abidjan";
      const payload: EvenementCreateInput = {
        titre: form.titre.trim(),
        volet: form.volet,
        // The typed time is interpreted in the activity's chosen zone, then stored
        // as an absolute UTC instant so every member sees it in their own time.
        debut: zonedToUtc(form.debut, zone),
        type: form.type,
        type_evenement_id: form.type_evenement_id ?? null,
        mode: form.mode,
        type_diffusion: form.type_diffusion,
        visibilite: form.visibilite,
        cible_type: cibleType,
        cible_id: CIBLE_UNITES.includes(cibleType) ? form.cible_id : null,
        cible_genre: form.cible_genre ?? null,
        cible_age_min: form.cible_age_min ?? null,
        cible_age_max: form.cible_age_max ?? null,
        cible_emails: emails,
        fuseau_horaire: zone,
        description: (form.description ?? "").trim() || null,
        intervenant_principal: (form.intervenant_principal ?? "").trim() || null,
        intervenants: (form.intervenants ?? []).map((x) => x.trim()).filter(Boolean),
      };
      if (form.fin) payload.fin = zonedToUtc(form.fin, zone);
      if (form.fenetre_reponse_heures) payload.fenetre_reponse_heures = Number(form.fenetre_reponse_heures);
      if (form.lieu?.trim()) payload.lieu = form.lieu.trim();
      const cleanLiens = liens.map((l) => l.trim()).filter((l) => l.length > 0);
      if (cleanLiens.length > 0) {
        payload.liens = cleanLiens;
        payload.lien_session = cleanLiens[0];
      }
      // Recurrence: generate the extra occurrences (2nd onward) as real dated
      // instants in the activity's own zone, so the server creates one activity
      // per date sharing a serie_id.
      if (repetition !== "aucune") {
        let extra: { debut: string; fin?: string; mode?: string }[] = [];
        let freq = "daily";
        if (repetition === "dates_precises") {
          freq = "custom";
          // Keep the base duration so each explicit date has the same length.
          const baseDurMs = form.fin ? new Date(zonedToUtc(form.fin, zone)).getTime() - new Date(payload.debut).getTime() : 0;
          extra = datesPrecises
            .filter((r) => r.debut)
            .map((r) => {
              const debutU = zonedToUtc(r.debut, zone);
              const occ: { debut: string; fin?: string; mode?: string } = { debut: debutU };
              if (baseDurMs > 0) occ.fin = new Date(new Date(debutU).getTime() + baseDurMs).toISOString();
              if (r.mode && r.mode !== (form.mode ?? "")) occ.mode = r.mode;
              return occ;
            });
        } else {
          const step = repetition === "hebdomadaire" ? 7 : 1;
          freq = repetition === "hebdomadaire" ? "weekly" : "daily";
          const count = Math.min(Math.max(2, Math.floor(nbOccurrences)), 104);
          for (let k = 1; k < count; k += 1) {
            const occ: { debut: string; fin?: string } = { debut: zonedToUtc(addDaysLocal(form.debut, k * step), zone) };
            if (form.fin) occ.fin = zonedToUtc(addDaysLocal(form.fin, k * step), zone);
            extra.push(occ);
          }
        }
        if (extra.length > 0) {
          payload.occurrences = extra;
          payload.recurrence = { freq, interval: 1, count: extra.length + 1 };
        }
      }
      const cree = await createEvenement(token, payload);
      // Upload the attachments joined during planning to the freshly created event.
      for (const f of piecesAJoindre) {
        try {
          const dataUrl = await lireFichier(f);
          await ajouterPieceEvenement(token, cree.id, { nom: f.name || `piece-${Date.now()}`, type: f.type, taille: f.size, data_url: dataUrl });
        } catch { /* a failed attachment must not lose the created event */ }
      }
      setForm(EMPTY);
      setLiens([""]);
      setRepetition("aucune");
      setNbOccurrences(1);
      setDatesPrecises([]);
      setEmailsTexte("");
      setPiecesAJoindre([]);
      evenements.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Calendrier des événements</h1>
          <p className="muted">Rencontres, formations, sessions en ligne.</p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" className={`btn btn-inline ${ongletPage === "calendrier" ? "btn-primary" : "btn-ghost"}`} onClick={() => setOngletPage("calendrier")}>
            Calendrier
          </button>
          <button type="button" className={`btn btn-inline ${ongletPage === "saisie" ? "btn-primary" : "btn-ghost"}`} onClick={() => setOngletPage("saisie")}>
            + Nouvelle activité
          </button>
        </div>
      </header>

      {ongletPage === "saisie" && (
      <>
      <form className="form-card" onSubmit={submit}>
        <div className="form-grid">
          <label className="full">
            <span>Titre *</span>
            <input value={form.titre} onChange={(e) => set("titre", e.target.value)} required />
          </label>
          <label>
            <span>Fuseau horaire de l&apos;activité *</span>
            <select value={form.fuseau_horaire ?? "Africa/Abidjan"} onChange={(e) => set("fuseau_horaire", e.target.value)}>
              {FUSEAUX.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <span className="muted small" style={{ fontWeight: 400 }}>
              Par défaut GMT (Côte d&apos;Ivoire). Si l&apos;activité a lieu ailleurs (ex. France), choisissez son fuseau :
              les heures seront saisies dans ce fuseau, et chaque membre les verra à sa propre heure.
            </span>
          </label>
          <label>
            <span>Début * (heure du fuseau ci-dessus)</span>
            <input type="datetime-local" value={form.debut} onChange={(e) => set("debut", e.target.value)} required />
          </label>
          <label>
            <span>Fin</span>
            <input type="datetime-local" value={form.fin ?? ""} onChange={(e) => set("fin", e.target.value)} />
          </label>
          <label>
            <span>Répétition</span>
            <select
              value={repetition}
              onChange={(e) => {
                const r = e.target.value as Repetition;
                setRepetition(r);
                if ((r === "quotidienne" || r === "hebdomadaire") && nbOccurrences < 2) setNbOccurrences(2);
                if (r === "dates_precises" && datesPrecises.length === 0) setDatesPrecises([{ debut: "", mode: form.mode ?? "presentiel" }]);
              }}
            >
              <option value="aucune">Aucune (activité unique)</option>
              <option value="quotidienne">Quotidienne</option>
              <option value="hebdomadaire">Hebdomadaire</option>
              <option value="dates_precises">Dates précises (intermittent)</option>
            </select>
          </label>
          {(repetition === "quotidienne" || repetition === "hebdomadaire") && (
            <label>
              <span>Nombre de dates (max 104)</span>
              <input type="number" min={2} max={104} value={nbOccurrences} onChange={(e) => setNbOccurrences(Number(e.target.value))} />
              <span className="muted small" style={{ fontWeight: 400 }}>
                Chaque date crée une activité réelle (pointage et questionnaire par jour). Ex. : programme de 21 jours = Quotidienne, 21 dates.
              </span>
            </label>
          )}
          {repetition === "dates_precises" && (
            <div className="full">
              <span className="muted small" style={{ display: "block", marginBottom: 6 }}>
                La 1re date est le « Début » ci-dessus (mode « {form.mode ?? "presentiel"} »). Ajoutez les autres dates, chacune avec son propre mode.
              </span>
              {datesPrecises.map((row, i) => (
                <div key={i} className="toolbar" style={{ marginBottom: 6 }}>
                  <input
                    type="datetime-local"
                    value={row.debut}
                    style={{ flex: 1 }}
                    onChange={(e) => setDatesPrecises((rows) => rows.map((x, j) => (j === i ? { ...x, debut: e.target.value } : x)))}
                  />
                  <select
                    value={row.mode}
                    onChange={(e) => setDatesPrecises((rows) => rows.map((x, j) => (j === i ? { ...x, mode: e.target.value } : x)))}
                  >
                    <option value="presentiel">Présentiel</option>
                    <option value="en_ligne">En ligne</option>
                    <option value="hybride">Hybride</option>
                  </select>
                  <button type="button" className="btn btn-ghost btn-inline" onClick={() => setDatesPrecises((rows) => rows.filter((_, j) => j !== i))}>
                    Retirer
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-ghost btn-inline"
                onClick={() => setDatesPrecises((rows) => [...rows, { debut: "", mode: form.mode ?? "presentiel" }])}
              >
                + Ajouter une date
              </button>
            </div>
          )}
          <label>
            <span>Fenêtre de réponse (h après la fin)</span>
            <input
              type="number"
              min={1}
              max={336}
              placeholder="Réglage global"
              value={form.fenetre_reponse_heures ?? ""}
              onChange={(e) => set("fenetre_reponse_heures", e.target.value ? Number(e.target.value) : undefined)}
            />
          </label>
          <label>
            <span>Volet</span>
            <select value={form.volet} onChange={(e) => set("volet", e.target.value)}>
              <option value="A">A (membres)</option>
              <option value="B">B (grand public)</option>
            </select>
          </label>
          <label>
            <span>Nature</span>
            <select value={form.type ?? "rassemblement"} onChange={(e) => set("type", e.target.value)}>
              <option value="rassemblement">Rassemblement</option>
              <option value="formation">Formation</option>
              <option value="priere">Prière</option>
            </select>
          </label>
          <label>
            <span>Type d&apos;événement (couleur du calendrier)</span>
            <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {typeCouleur && <span aria-hidden style={{ width: 16, height: 16, borderRadius: 4, background: typeCouleur, border: "1px solid rgba(0,0,0,0.15)", flexShrink: 0 }} />}
              <select style={{ flex: 1 }} value={form.type_evenement_id ?? ""} onChange={(e) => set("type_evenement_id", e.target.value || null)}>
                <option value="">Aucun (couleur par défaut)</option>
                {typesPublies.map((te) => <option key={te.id} value={te.id}>{te.nom}</option>)}
              </select>
            </span>
          </label>
          <label>
            <span>Mode</span>
            <select value={form.mode ?? "presentiel"} onChange={(e) => set("mode", e.target.value)}>
              <option value="presentiel">Présentiel</option>
              <option value="en_ligne">En ligne</option>
              <option value="hybride">Hybride (présentiel + en ligne)</option>
            </select>
          </label>
          <label>
            <span>
              Destinataires (qui est concerné ?)
              <InfoTip title="Destinataires" text="Choisissez qui reçoit et voit l'activité : toute la communauté, une unité (coordination, commission/mission, intendance, tribu), les Bergers, les responsables, ou une liste d'adresses e-mail. Vous pouvez ensuite affiner par genre et par âge." />
            </span>
            <select
              value={form.cible_type ?? "general"}
              onChange={(e) => {
                set("cible_type", e.target.value as CibleType);
                set("cible_id", null);
              }}
            >
              {(Object.keys(CIBLE_LABELS) as CibleType[]).map((k) => (
                <option key={k} value={k}>{CIBLE_LABELS[k]}</option>
              ))}
            </select>
          </label>
          {form.cible_type && CIBLE_UNITES.includes(form.cible_type) && (
            <label>
              <span>Unité ciblée *</span>
              <select value={form.cible_id ?? ""} onChange={(e) => set("cible_id", e.target.value || null)}>
                <option value="">Choisir...</option>
                {cibleOptions.map((u) => (
                  <option key={u.id} value={u.id}>{u.nom}</option>
                ))}
              </select>
            </label>
          )}
          {form.cible_type === "liste" && (
            <label className="full">
              <span>
                Adresses e-mail *
                <InfoTip title="Liste d'adresses" text="Une adresse par ligne (ou séparées par des virgules). Seuls les membres dont l'e-mail figure ici seront concernés. Idéal pour un petit groupe ponctuel." />
              </span>
              <textarea
                value={emailsTexte}
                onChange={(e) => setEmailsTexte(e.target.value)}
                rows={3}
                placeholder={"prenom.nom@example.com\nautre@example.com"}
              />
            </label>
          )}
          <div className="full" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <label>
              <span>
                Affiner par genre
                <InfoTip title="Genre (facultatif)" text="Restreindre en plus aux hommes ou aux femmes. Se combine avec le destinataire choisi (ex. les femmes d'une commission)." />
              </span>
              <select value={form.cible_genre ?? ""} onChange={(e) => set("cible_genre", (e.target.value || null) as EvenementCreateInput["cible_genre"])}>
                <option value="">Tous</option>
                <option value="homme">Hommes</option>
                <option value="femme">Femmes</option>
              </select>
            </label>
            <label>
              <span>
                Âge min.
                <InfoTip title="Tranche d'âge (facultatif)" text="Restreindre en plus à une tranche d'âge (ex. les jeunes de 15 à 30 ans). Laisser vide pour tous les âges." />
              </span>
              <input type="number" min={0} max={120} value={form.cible_age_min ?? ""} onChange={(e) => set("cible_age_min", e.target.value ? Number(e.target.value) : null)} />
            </label>
            <label>
              <span>Âge max.</span>
              <input type="number" min={0} max={120} value={form.cible_age_max ?? ""} onChange={(e) => set("cible_age_max", e.target.value ? Number(e.target.value) : null)} />
            </label>
          </div>
          <label>
            <span>Diffusion</span>
            <select
              value={form.type_diffusion ?? "aucun"}
              onChange={(e) => set("type_diffusion", e.target.value as EvenementCreateInput["type_diffusion"])}
            >
              <option value="aucun">Aucune</option>
              <option value="embed">Diffusion intégrée (embed)</option>
              <option value="externe">Lien externe</option>
            </select>
          </label>
          <label>
            <span>Visibilité</span>
            <select
              value={form.visibilite ?? "membres"}
              onChange={(e) => set("visibilite", e.target.value as EvenementCreateInput["visibilite"])}
            >
              <option value="public">Public</option>
              <option value="membres">Membres</option>
              <option value="prive">Privé</option>
            </select>
          </label>
          <label>
            <span>Lieu</span>
            <input value={form.lieu ?? ""} onChange={(e) => set("lieu", e.target.value)} />
          </label>
          <div className="full">
            <LiensEditor liens={liens} onChange={setLiens} disabled={busy} />
          </div>
          <label className="full">
            <span>Intervenant principal (orateur)</span>
            <input value={form.intervenant_principal ?? ""} onChange={(e) => set("intervenant_principal", e.target.value)} placeholder="Nom de l'intervenant principal" />
          </label>
          <div className="full">
            <span>Autres intervenants</span>
            {(form.intervenants ?? [""]).map((v, i) => (
              <div key={i} style={{ display: "flex", gap: 6, marginTop: 4 }}>
                <input style={{ flex: 1 }} value={v} placeholder="Nom d'un intervenant" onChange={(e) => set("intervenants", (form.intervenants ?? [""]).map((x, j) => (j === i ? e.target.value : x)))} />
                <button type="button" className="btn btn-ghost btn-inline" onClick={() => { const arr = form.intervenants ?? [""]; set("intervenants", arr.length > 1 ? arr.filter((_, j) => j !== i) : [""]); }}>Retirer</button>
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-inline" style={{ marginTop: 4 }} onClick={() => set("intervenants", [...(form.intervenants ?? [""]), ""])}>+ Ajouter un intervenant</button>
          </div>
          <div className="full">
            <span>Description</span>
            <RichEditor value={form.description ?? ""} onChange={(html) => set("description", html)} disabled={busy} />
          </div>
          <div className="full">
            <span>Pièces jointes (images, documents)</span>
            <PiecesACharger files={piecesAJoindre} onChange={setPiecesAJoindre} />
          </div>
        </div>
        {error && <p className="banner banner-error">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-inline" disabled={busy}>
            {busy ? "Création..." : "+ Nouvel événement"}
          </button>
        </div>
      </form>

      <section className="card">
        <h2 className="card-title">Fenêtre des questionnaires</h2>
        <p className="muted small">Durée, en heures après la fin d'une session, pendant laquelle son questionnaire reste ouvert.</p>
        <div className="toolbar">
          <input
            type="range"
            min={1}
            max={72}
            step={1}
            value={fenetreValue}
            onChange={(e) => setFenetreLocal(Number(e.target.value))}
            onPointerUp={(e) => saveFenetre(Number(e.currentTarget.value))}
            onKeyUp={(e) => saveFenetre(Number(e.currentTarget.value))}
            style={{ flex: 1 }}
          />
          <span className="mono" style={{ minWidth: 56, textAlign: "right" }}>{fenetreValue} h</span>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Premier jour de la semaine</h2>
        <p className="muted small">
          Détermine la plage d'une semaine pour le récapitulatif (semaine précédente) et l'agenda (semaine en cours)
          envoyés aux membres. Chaque organisation peut choisir son jour de départ (semaine du lundi au dimanche inclus,
          ou d'un autre jour au jour précédent).
        </p>
        <div className="toolbar">
          <select
            className="search"
            value={semaineDebut.data?.jour ?? 0}
            onChange={(e) => saveSemaineDebut(Number(e.target.value))}
          >
            {["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"].map((j, i) => (
              <option key={j} value={i}>{j}</option>
            ))}
          </select>
        </div>
      </section>
      </>
      )}

      {ongletPage === "calendrier" && (
      <>
      {evenements.error && <p className="banner banner-error">{evenements.error}</p>}

      <div className="toolbar" style={{ justifyContent: "space-between", alignItems: "center", margin: "6px 0 10px" }}>
        <h2 className="card-title" style={{ margin: 0 }}>Planning des activités</h2>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" className={`btn btn-inline ${vue === "calendrier" ? "btn-primary" : "btn-ghost"}`} onClick={() => setVue("calendrier")}>
            Calendrier
          </button>
          <button type="button" className={`btn btn-inline ${vue === "liste" ? "btn-primary" : "btn-ghost"}`} onClick={() => setVue("liste")}>
            Liste
          </button>
        </div>
      </div>

      {vue === "calendrier" ? (
        <CalendrierEvenements token={token} evenements={evenements.data ?? []} onChanged={evenements.reload} />
      ) : (
        <>
          {(evenements.data ?? []).map((ev) => (
            <section className="card" key={ev.id}>
              <div className="list-row" style={{ border: "none", background: "transparent", padding: 0 }}>
                <div className="event-main">
                  <strong style={{ textDecoration: ev.annule ? "line-through" : "none" }}>{ev.titre}</strong>
                  <span className="muted">{formatDate(ev.debut)}</span>
                </div>
                <div className="list-meta">
                  {ev.annule && <span className="badge badge-warn">Annulé</span>}
                  {ev.session_ouverte && <span className="badge badge-ok">Session ouverte</span>}
                  {ev.mode && <span className="badge badge-mut">{ev.mode === "en_ligne" ? "En ligne" : ev.mode === "hybride" ? "Hybride" : "Présentiel"}</span>}
                  {ev.cible_type && ev.cible_type !== "general" && (
                    <span className="badge badge-warn">Réservé : {ev.cible_libelle ?? ev.cible_type}</span>
                  )}
                  {ev.lieu && <span className="muted">{ev.lieu}</span>}
                  <span className="badge badge-mut">Volet {ev.volet}</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-inline"
                    onClick={() => setOpenId(openId === ev.id ? null : ev.id)}
                  >
                    {openId === ev.id ? "Fermer" : "Gérer la session"}
                  </button>
                </div>
              </div>
              {openId === ev.id && <EvenementGestion token={token} evenement={ev} onChanged={evenements.reload} />}
            </section>
          ))}
          {!evenements.loading && (evenements.data ?? []).length === 0 && (
            <p className="muted">Aucun événement.</p>
          )}
        </>
      )}
      </>
      )}
    </div>
  );
}
