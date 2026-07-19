import { useEffect, useState } from "react";

import {
  ApiError,
  type CibleType,
  type EvenementCreateInput,
  ajouterPieceEvenement,
  apercuCibleActivite,
  createEvenement,
  getCiblesActivite,
  getCommissions,
  getCoordinations,
  getEvenements,
  getIntendances,
  getMesPreferences,
  getQuestionnaireFenetreMinutes,
  getSemaineJourDebut,
  getTribus,
  getTypesEvenements,
  setMesPreferences,
  setQuestionnaireFenetreMinutes,
  setSemaineJourDebut,
} from "../api.js";
import { formatDate } from "../format.js";
import { FUSEAUX } from "../lib/fuseaux.js";
import { zonedToUtc } from "../lib/tz.js";
import { useResource } from "../useResource.js";
import { CalendrierEvenements } from "./CalendrierEvenements.js";
import { DestinationsCiblage } from "./DestinationsCiblage.js";
import { EvenementGestion } from "./EvenementGestion.js";
import { PiecesACharger } from "./PiecesACharger.js";
import { lireFichier } from "./PiecesEvenement.js";
import { InfoTip } from "./InfoTip.js";
import { LiensEditor } from "./LiensEditor.js";
import { type Plan, PlanificationActivite } from "./PlanificationActivite.js";
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

// The destination list (labels, order, unit requirement) comes from the
// administrable referential (GET /reference/cibles-activite): an administrator
// can add, rename, reorder or deactivate a destination without any code change.


// Personal display preference (calendar vs list) for the events section. It is a
// per-account view choice, kept in localStorage so it persists for THIS operator on
// THIS browser and never changes what anyone else sees. Calendar is the default.
const VUE_PREF_KEY = "adsum.bo.evenements.vue";
function loadVuePref(): "calendrier" | "liste" {
  try {
    const v = typeof localStorage !== "undefined" ? localStorage.getItem(VUE_PREF_KEY) : null;
    return v === "liste" ? "liste" : "calendrier";
  } catch {
    return "calendrier";
  }
}

export function Evenements({
  token,
  canGerer = false,
  canSuperviser = false,
  canParametres = false,
}: {
  token: string;
  // evenements.gerer: create an activity and manage it (edit/session/tags/cancel/delete).
  canGerer?: boolean;
  // evenements.superviser: trigger the attendance survey on an activity.
  canSuperviser?: boolean;
  // parametres.gerer: change the questionnaire window and the week start (org settings).
  canParametres?: boolean;
}): JSX.Element {
  const evenements = useResource(() => getEvenements(token), [token]);
  const fenetre = useResource(() => getQuestionnaireFenetreMinutes(token), [token]);
  const semaineDebut = useResource(() => getSemaineJourDebut(token), [token]);
  // Units available as an activity target. Loaded once; the second select only
  // shows the list matching the chosen target kind.
  const coordinations = useResource(() => getCoordinations(token), [token]);
  const commissions = useResource(() => getCommissions(token), [token]);
  const intendances = useResource(() => getIntendances(token), [token]);
  const tribus = useResource(() => getTribus(token), [token]);
  // Administrable destinations referential: single source of the target list.
  const cibles = useResource(() => getCiblesActivite(token), [token]);
  const [form, setForm] = useState<EvenementCreateInput>(EMPTY);
  const [piecesAJoindre, setPiecesAJoindre] = useState<File[]>([]);
  const typesEvenements = useResource(() => getTypesEvenements(token), [token]);
  const typesPublies = (typesEvenements.data ?? []).filter((t) => t.publie);
  const typeCouleur = typesPublies.find((t) => t.id === form.type_evenement_id)?.couleur ?? null;
  const [liens, setLiens] = useState<string[]>([""]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  // Three page sections so the page is never one long scroll and so the global
  // organisation settings are never mixed into the creation form: the activities
  // section (view and manage), the creation form (data entry) and the settings.
  const [ongletPage, setOngletPage] = useState<"calendrier" | "saisie" | "parametres">("calendrier");
  // Month calendar is the default display; the flat list stays available. The choice
  // is a personal preference persisted per operator (see loadVuePref / choisirVue).
  const [vue, setVue] = useState<"calendrier" | "liste">(loadVuePref);
  // Scheduling plan (dates separated from per-day times): the source of truth for
  // debut/fin and the series occurrences. planKey remounts the planner on reset.
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planKey, setPlanKey] = useState(0);
  // Ad-hoc e-mail list (one per line / comma) for a 'liste' target.
  const [emailsTexte, setEmailsTexte] = useState("");
  // Local value of the questionnaire-window slider while it is being dragged, so
  // the position is persisted only once, on release, not on every tick (which
  // would flood the API and the audit log).
  const [fenetreLocal, setFenetreLocal] = useState<number | null>(null);
  const fenetreValue = fenetreLocal ?? fenetre.data?.minutes ?? 120;

  function saveFenetre(minutes: number): void {
    setFenetreLocal(null);
    void setQuestionnaireFenetreMinutes(token, minutes).then(() => fenetre.reload()).catch(() => undefined);
  }

  // The server-side preference is authoritative (it follows the account across
  // browsers); localStorage stays as an instant cache for the very first paint.
  useEffect(() => {
    let alive = true;
    getMesPreferences(token)
      .then((p) => {
        if (alive && (p.vue_evenements === "calendrier" || p.vue_evenements === "liste")) setVue(p.vue_evenements);
      })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [token]);

  // Change the display mode and remember it for this operator only: instantly in
  // this browser (localStorage) and durably on the account (server preference).
  function choisirVue(v: "calendrier" | "liste"): void {
    setVue(v);
    try {
      if (typeof localStorage !== "undefined") localStorage.setItem(VUE_PREF_KEY, v);
    } catch {
      /* private mode: the choice stays for this session only. */
    }
    void setMesPreferences(token, { vue_evenements: v }).catch(() => undefined);
  }

  function saveSemaineDebut(jour: number): void {
    void setSemaineJourDebut(token, jour).then(() => semaineDebut.reload()).catch(() => undefined);
  }

  function set<K extends keyof EvenementCreateInput>(key: K, value: EvenementCreateInput[K]): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // The chosen destination row from the referential drives everything: whether a
  // unit must be picked (besoin_unite), which unit list to show (parametres.table)
  // and whether the ad-hoc e-mail list applies (type_regle 'liste').
  const cibleCourante = (cibles.data ?? []).find((c) => c.code === (form.cible_type ?? "general"));
  const besoinUnite = cibleCourante?.besoin_unite ?? false;
  const uniteTable = cibleCourante?.parametres.table ?? "";
  const cibleOptions: { id: string; nom: string }[] =
    uniteTable === "coordination"
      ? (coordinations.data ?? [])
      : uniteTable === "commission"
        ? (commissions.data ?? [])
        : uniteTable === "intendance"
          ? (intendances.data ?? [])
          : uniteTable === "tribu"
            ? (tribus.data ?? [])
            : [];

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!form.titre.trim()) return;
    if (!plan) {
      setError("Renseignez la planification : au moins une date avec son heure de début et de fin.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const cibleType = form.cible_type ?? "general";
      if (besoinUnite && !form.cible_id) {
        setError("Choisissez l'unité ciblée ou repassez sur « général ».");
        setBusy(false);
        return;
      }
      const estListe = cibleCourante?.type_regle === "liste";
      const emails = estListe
        ? emailsTexte.split(/[\n,;]+/).map((x) => x.trim().toLowerCase()).filter(Boolean)
        : [];
      if (estListe && emails.length === 0) {
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
        // The planner separates dates from per-day times; the first slot is the
        // master. The typed time is interpreted in the activity's chosen zone, then
        // stored as an absolute UTC instant so every member sees it in their own time.
        debut: zonedToUtc(plan.debut, zone),
        type: form.type,
        type_evenement_id: form.type_evenement_id ?? null,
        mode: form.mode,
        type_diffusion: form.type_diffusion,
        visibilite: form.visibilite,
        cible_type: cibleType,
        cible_id: besoinUnite ? form.cible_id : null,
        cible_genre: form.cible_genre ?? null,
        cible_age_min: form.cible_age_min ?? null,
        cible_age_max: form.cible_age_max ?? null,
        cible_emails: emails,
        fuseau_horaire: zone,
        description: (form.description ?? "").trim() || null,
        intervenant_principal: (form.intervenant_principal ?? "").trim() || null,
        intervenants: (form.intervenants ?? []).map((x) => x.trim()).filter(Boolean),
      };
      // Same-day end always set by the planner (no more phantom multi-day span).
      payload.fin = zonedToUtc(plan.fin, zone);
      if (form.fenetre_reponse_heures) payload.fenetre_reponse_heures = Number(form.fenetre_reponse_heures);
      if (form.lieu?.trim()) payload.lieu = form.lieu.trim();
      const cleanLiens = liens.map((l) => l.trim()).filter((l) => l.length > 0);
      if (cleanLiens.length > 0) {
        payload.liens = cleanLiens;
        payload.lien_session = cleanLiens[0];
      }
      // Each planned slot beyond the first becomes a real dated occurrence sharing a
      // serie_id, so a multi-day activity gives one pointage and one questionnaire
      // per day. Every occurrence carries its own same-day debut and fin.
      if (plan.occurrences.length > 0) {
        payload.occurrences = plan.occurrences.map((o) => {
          const occ: { debut: string; fin?: string; mode?: string } = { debut: zonedToUtc(o.debut, zone), fin: zonedToUtc(o.fin, zone) };
          if (o.mode && o.mode !== (form.mode ?? "")) occ.mode = o.mode;
          return occ;
        });
        payload.recurrence = { freq: "custom", interval: 1, count: payload.occurrences.length + 1 };
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
      setPlan(null);
      setPlanKey((k) => k + 1);
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
            Activités
          </button>
          {canGerer && (
            <button type="button" className={`btn btn-inline ${ongletPage === "saisie" ? "btn-primary" : "btn-ghost"}`} onClick={() => setOngletPage("saisie")}>
              + Nouvelle activité
            </button>
          )}
          <button type="button" className={`btn btn-inline ${ongletPage === "parametres" ? "btn-primary" : "btn-ghost"}`} onClick={() => setOngletPage("parametres")}>
            Paramètres
          </button>
        </div>
      </header>

      {ongletPage === "saisie" && (
      <>
      {canGerer ? (
      <form className="form-card" onSubmit={submit}>
        <h2 className="card-title" style={{ marginTop: 0 }}>Créer une activité</h2>
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
          <PlanificationActivite key={planKey} modeDefaut={form.mode} onChange={setPlan} />
          <label>
            <span>Fenêtre de pointage spécifique (h, facultatif)</span>
            <input
              type="number"
              min={1}
              max={336}
              placeholder="Par défaut : 2 h"
              value={form.fenetre_reponse_heures ?? ""}
              onChange={(e) => set("fenetre_reponse_heures", e.target.value ? Number(e.target.value) : undefined)}
            />
            <span className="muted small" style={{ fontWeight: 400 }}>Laissez vide pour appliquer le réglage global (2 h par défaut).</span>
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
              {(cibles.data ?? []).map((c) => (
                <option key={c.code} value={c.code}>{c.libelle}</option>
              ))}
            </select>
            {cibles.error && <span className="muted small">Destinations indisponibles : rechargez la page.</span>}
            {cibleCourante?.description && <span className="muted small">{cibleCourante.description}</span>}
          </label>
          {besoinUnite && (
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
          <ApercuAudience token={token} code={form.cible_type ?? "general"} cibleId={form.cible_id ?? null} besoinUnite={besoinUnite} typeRegle={cibleCourante?.type_regle ?? null} />
          {cibleCourante?.type_regle === "liste" && (
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
            {busy ? "Création en cours..." : "Créer l'activité"}
          </button>
        </div>
      </form>
      ) : (
        <p className="banner banner-info small">
          Création d'activité en lecture seule. La planification et la gestion des événements requièrent la permission
          <span className="mono"> evenements.gerer</span>.
        </p>
      )}
      </>
      )}

      {ongletPage === "parametres" && (
      <>
      <div className="page-head" style={{ marginBottom: 8 }}>
        <div>
          <h2 className="card-title" style={{ margin: 0 }}>Paramètres des événements</h2>
          <p className="muted small">Réglages globaux de l'organisation. Ils s'appliquent à toutes les activités et ne sont jamais modifiés lors de la création d'une activité.</p>
        </div>
      </div>

      <section className="card">
        <h2 className="card-title">Fenêtre de pointage et de questionnaire</h2>
        <p className="muted small">
          Durée pendant laquelle le pointage et le questionnaire d'une séance restent ouverts APRÈS la fin de l'activité.
          Par défaut 2 heures. Réglable par pas de 30 minutes. À 0, le sondage se clôture exactement à la fin de l'activité.
        </p>
        {!canParametres && <p className="banner banner-info small">Lecture seule : modifier ce réglage requiert la permission de gestion des paramètres.</p>}
        <div className="toolbar">
          <input
            type="range"
            min={0}
            max={480}
            step={30}
            value={fenetreValue}
            disabled={!canParametres}
            onChange={(e) => setFenetreLocal(Number(e.target.value))}
            onPointerUp={(e) => saveFenetre(Number(e.currentTarget.value))}
            onKeyUp={(e) => saveFenetre(Number(e.currentTarget.value))}
            style={{ flex: 1 }}
          />
          <span className="mono" style={{ minWidth: 96, textAlign: "right" }}>
            {fenetreValue === 0 ? "Immédiat" : `${Math.floor(fenetreValue / 60)} h ${String(fenetreValue % 60).padStart(2, "0")}`}
          </span>
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
            disabled={!canParametres}
            onChange={(e) => saveSemaineDebut(Number(e.target.value))}
          >
            {["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"].map((j, i) => (
              <option key={j} value={i}>{j}</option>
            ))}
          </select>
        </div>
      </section>

      <DestinationsCiblage token={token} canGerer={canParametres} />
      </>
      )}

      {ongletPage === "calendrier" && (
      <>
      {evenements.error && <p className="banner banner-error">{evenements.error}</p>}

      <div className="toolbar" style={{ justifyContent: "space-between", alignItems: "center", margin: "6px 0 10px" }}>
        <h2 className="card-title" style={{ margin: 0 }}>Planning des activités</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="muted small">Affichage</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" className={`btn btn-inline ${vue === "calendrier" ? "btn-primary" : "btn-ghost"}`} aria-pressed={vue === "calendrier"} onClick={() => choisirVue("calendrier")}>
              Calendrier
            </button>
            <button type="button" className={`btn btn-inline ${vue === "liste" ? "btn-primary" : "btn-ghost"}`} aria-pressed={vue === "liste"} onClick={() => choisirVue("liste")}>
              Liste
            </button>
          </div>
        </div>
      </div>

      {vue === "calendrier" ? (
        <CalendrierEvenements token={token} evenements={evenements.data ?? []} canGerer={canGerer} canSuperviser={canSuperviser} onChanged={evenements.reload} />
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
              {openId === ev.id && <EvenementGestion token={token} evenement={ev} canGerer={canGerer} canSuperviser={canSuperviser} onChanged={evenements.reload} />}
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

/** Live audience preview under the destination selector: how many active members
 * the chosen destination currently reaches. Computed SERVER-SIDE with the same
 * safe rule templates as the visibility engine, so the number is real, never a
 * front-side guess. Hidden for 'liste' (its audience is the typed e-mails) and
 * while a unit destination has no unit picked yet. */
function ApercuAudience({ token, code, cibleId, besoinUnite, typeRegle }: {
  token: string;
  code: string;
  cibleId: string | null;
  besoinUnite: boolean;
  typeRegle: string | null;
}): JSX.Element | null {
  const [nombre, setNombre] = useState<number | null>(null);
  useEffect(() => {
    setNombre(null);
    if (!code || typeRegle === "liste" || (besoinUnite && !cibleId)) return;
    let alive = true;
    apercuCibleActivite(token, code, cibleId)
      .then((a) => { if (alive) setNombre(a.nombre); })
      .catch(() => { if (alive) setNombre(null); });
    return () => { alive = false; };
  }, [token, code, cibleId, besoinUnite, typeRegle]);
  if (typeRegle === "liste" || nombre == null) return null;
  if (nombre === 0) {
    return (
      <p className="banner banner-warn full" style={{ margin: 0 }}>
        Attention : aucun membre actif ne correspond actuellement à cette destination. L'activité serait créée mais ne toucherait personne.
      </p>
    );
  }
  return (
    <p className="muted small full" style={{ margin: 0 }}>
      Aperçu : {nombre} membre{nombre > 1 ? "s" : ""} actif{nombre > 1 ? "s" : ""} concerné{nombre > 1 ? "s" : ""} (calcul serveur, doublons exclus).
    </p>
  );
}
