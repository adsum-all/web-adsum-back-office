import { useState } from "react";

import {
  ApiError,
  type CibleType,
  type Evenement,
  type EvenementCreateInput,
  type TypeDiffusion,
  getCommissions,
  getCoordinations,
  getIntendances,
  getTribus,
  updateEvenement,
} from "../api.js";
import { FUSEAUX } from "../lib/fuseaux.js";
import { utcToZoned, zonedToUtc } from "../lib/tz.js";
import { useResource } from "../useResource.js";
import { InfoTip } from "./InfoTip.js";
import { LiensEditor } from "./LiensEditor.js";
import { RichEditor } from "./RichEditor.js";
import { SerieOccurrences } from "./SerieOccurrences.js";

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

const CIBLE_UNITES: CibleType[] = ["coordination", "commission", "intendance", "tribu"];

/** Compact edit form for an existing activity's core details, reachable from the
 * calendar. Reuses the create validation server-side (PUT sends a full payload).
 * Times are shown and re-read in the activity's own time zone. */
export function EvenementEdition({
  token,
  evenement,
  onSaved,
}: {
  token: string;
  evenement: Evenement;
  onSaved: () => void;
}): JSX.Element {
  const zone0 = evenement.fuseau_horaire ?? "Africa/Abidjan";
  const [titre, setTitre] = useState(evenement.titre);
  const [zone, setZone] = useState(zone0);
  const [debut, setDebut] = useState(utcToZoned(evenement.debut, zone0));
  const [fin, setFin] = useState(evenement.fin ? utcToZoned(evenement.fin, zone0) : "");
  const [lieu, setLieu] = useState(evenement.lieu ?? "");
  const [type, setType] = useState(evenement.type ?? "rassemblement");
  const [mode, setMode] = useState(evenement.mode ?? "presentiel");
  const [diffusion, setDiffusion] = useState<TypeDiffusion>(evenement.type_diffusion ?? "aucun");
  const [visibilite, setVisibilite] = useState(evenement.visibilite ?? "membres");
  const [volet, setVolet] = useState(evenement.volet);
  // Broadcast links and the response-window override are edited here too, so the
  // detail form is the single, complete editor (and never silently resets them).
  const [liensList, setLiensList] = useState<string[]>(
    evenement.liens && evenement.liens.length > 0 ? evenement.liens : evenement.lien_session ? [evenement.lien_session] : [""],
  );
  const [fenetre, setFenetre] = useState<string>(evenement.fenetre_reponse_heures != null ? String(evenement.fenetre_reponse_heures) : "");
  // Full targeting is editable after creation (the audience can change).
  const [cibleType, setCibleType] = useState<CibleType>(evenement.cible_type ?? "general");
  const [cibleId, setCibleId] = useState<string | null>(evenement.cible_id ?? null);
  const [cibleGenre, setCibleGenre] = useState<string>(evenement.cible_genre ?? "");
  const [ageMin, setAgeMin] = useState<string>(evenement.cible_age_min != null ? String(evenement.cible_age_min) : "");
  const [ageMax, setAgeMax] = useState<string>(evenement.cible_age_max != null ? String(evenement.cible_age_max) : "");
  const [emailsTexte, setEmailsTexte] = useState<string>((evenement.cible_emails ?? []).join("\n"));
  const [description, setDescription] = useState<string>(evenement.description ?? "");
  const [principal, setPrincipal] = useState<string>(evenement.intervenant_principal ?? "");
  const [intervenants, setIntervenants] = useState<string[]>(
    evenement.intervenants && evenement.intervenants.length > 0 ? evenement.intervenants : [""],
  );
  const coordinations = useResource(() => getCoordinations(token), [token]);
  const commissions = useResource(() => getCommissions(token), [token]);
  const intendances = useResource(() => getIntendances(token), [token]);
  const tribus = useResource(() => getTribus(token), [token]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const cibleOptions: { id: string; nom: string }[] =
    cibleType === "coordination" ? (coordinations.data ?? [])
      : cibleType === "commission" ? (commissions.data ?? [])
        : cibleType === "intendance" ? (intendances.data ?? [])
          : cibleType === "tribu" ? (tribus.data ?? []) : [];
  // When the activity is part of a series, the admin can apply the details (not
  // the date) to every occurrence of the series at once.
  const estSerie = !!evenement.serie_id;
  const [toucherSerie, setToucherSerie] = useState(false);

  async function save(): Promise<void> {
    if (!titre.trim() || !debut) {
      setError("Le titre et la date de début sont obligatoires.");
      return;
    }
    if (CIBLE_UNITES.includes(cibleType) && !cibleId) {
      setError("Choisissez l'unité ciblée ou repassez sur « général ».");
      return;
    }
    const emails = cibleType === "liste"
      ? emailsTexte.split(/[\n,;]+/).map((x) => x.trim().toLowerCase()).filter(Boolean)
      : [];
    if (cibleType === "liste" && emails.length === 0) {
      setError("Ajoutez au moins une adresse e-mail pour un ciblage par liste.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const cleanLiens = liensList.map((l) => l.trim()).filter((l) => l.length > 0);
      const payload: EvenementCreateInput = {
        titre: titre.trim(),
        volet,
        debut: zonedToUtc(debut, zone),
        type,
        mode,
        type_diffusion: diffusion,
        visibilite,
        cible_type: cibleType,
        cible_id: CIBLE_UNITES.includes(cibleType) ? cibleId : null,
        cible_genre: (cibleGenre || null) as EvenementCreateInput["cible_genre"],
        cible_age_min: ageMin ? Number(ageMin) : null,
        cible_age_max: ageMax ? Number(ageMax) : null,
        cible_emails: emails,
        // Preserve (or edit) the per-activity response window; without this the
        // update would reset a custom window back to the global default.
        fenetre_reponse_heures: fenetre ? Number(fenetre) : undefined,
        fuseau_horaire: zone,
        description: description.trim() || null,
        intervenant_principal: principal.trim() || null,
        intervenants: intervenants.map((x) => x.trim()).filter(Boolean),
      };
      if (fin) payload.fin = zonedToUtc(fin, zone);
      if (lieu.trim()) payload.lieu = lieu.trim();
      if (cleanLiens.length > 0) {
        payload.liens = cleanLiens;
        payload.lien_session = cleanLiens[0];
      }
      await updateEvenement(token, evenement.id, payload, estSerie && toucherSerie ? "toute_la_serie" : undefined);
      setOk(true);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ borderTop: "1px solid var(--adsum-line)", marginTop: 10, paddingTop: 12 }}>
      <p className="card-title" style={{ marginBottom: 8 }}>Modifier les détails</p>
      {ok && <p className="banner banner-ok">Activité mise à jour.</p>}
      {error && <p className="banner banner-error">{error}</p>}
      <div className="form-grid">
        <label className="full">
          <span>Titre *</span>
          <input value={titre} onChange={(e) => setTitre(e.target.value)} />
        </label>
        <label>
          <span>Fuseau horaire</span>
          <select value={zone} onChange={(e) => setZone(e.target.value)}>
            {FUSEAUX.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label>
          <span>Début * (heure du fuseau)</span>
          <input type="datetime-local" value={debut} onChange={(e) => setDebut(e.target.value)} />
        </label>
        <label>
          <span>Fin</span>
          <input type="datetime-local" value={fin} onChange={(e) => setFin(e.target.value)} />
        </label>
        <label>
          <span>Lieu</span>
          <input value={lieu} onChange={(e) => setLieu(e.target.value)} />
        </label>
        <label>
          <span>Type</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="rassemblement">Rassemblement</option>
            <option value="formation">Formation</option>
            <option value="priere">Prière</option>
          </select>
        </label>
        <label>
          <span>Mode</span>
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="presentiel">Présentiel</option>
            <option value="en_ligne">En ligne</option>
            <option value="hybride">Hybride</option>
          </select>
        </label>
        <label>
          <span>Diffusion</span>
          <select value={diffusion} onChange={(e) => setDiffusion(e.target.value as TypeDiffusion)}>
            <option value="aucun">Aucune</option>
            <option value="embed">Diffusion intégrée (embed)</option>
            <option value="externe">Lien externe</option>
          </select>
        </label>
        <label>
          <span>Visibilité</span>
          <select value={visibilite} onChange={(e) => setVisibilite(e.target.value as typeof visibilite)}>
            <option value="public">Public</option>
            <option value="membres">Membres</option>
            <option value="prive">Privé</option>
          </select>
        </label>
        <label>
          <span>Volet</span>
          <select value={volet} onChange={(e) => setVolet(e.target.value)}>
            <option value="A">A (membres)</option>
            <option value="B">B (grand public)</option>
          </select>
        </label>
        <label>
          <span>
            Fenêtre de réponse (h après la fin)
            <InfoTip title="Fenêtre de réponse" text="Durée, en heures après la fin, pendant laquelle le questionnaire de la session reste ouvert. Laisser vide pour appliquer le réglage global." />
          </span>
          <input type="number" min={1} max={336} placeholder="Réglage global" value={fenetre} onChange={(e) => setFenetre(e.target.value)} />
        </label>
        <label className="full">
          <span>
            Destinataires
            <InfoTip title="Destinataires" text="Qui est concerné : toute la communauté, une unité (coordination, commission/mission, intendance, tribu), les Bergers, les responsables, ou une liste d'e-mails. Affinez ensuite par genre et âge. Modifiable à tout moment tant que l'activité n'a pas eu lieu." />
          </span>
          <select value={cibleType} onChange={(e) => { setCibleType(e.target.value as CibleType); setCibleId(null); }}>
            {(Object.keys(CIBLE_LABELS) as CibleType[]).map((k) => <option key={k} value={k}>{CIBLE_LABELS[k]}</option>)}
          </select>
        </label>
        {CIBLE_UNITES.includes(cibleType) && (
          <label>
            <span>Unité ciblée *</span>
            <select value={cibleId ?? ""} onChange={(e) => setCibleId(e.target.value || null)}>
              <option value="">Choisir...</option>
              {cibleOptions.map((u) => <option key={u.id} value={u.id}>{u.nom}</option>)}
            </select>
          </label>
        )}
        {cibleType === "liste" && (
          <label className="full">
            <span>Adresses e-mail *</span>
            <textarea value={emailsTexte} onChange={(e) => setEmailsTexte(e.target.value)} rows={2} placeholder={"une adresse par ligne"} />
          </label>
        )}
        <label>
          <span>Affiner par genre</span>
          <select value={cibleGenre} onChange={(e) => setCibleGenre(e.target.value)}>
            <option value="">Tous</option>
            <option value="homme">Hommes</option>
            <option value="femme">Femmes</option>
          </select>
        </label>
        <label>
          <span>Âge min.</span>
          <input type="number" min={0} max={120} value={ageMin} onChange={(e) => setAgeMin(e.target.value)} />
        </label>
        <label>
          <span>Âge max.</span>
          <input type="number" min={0} max={120} value={ageMax} onChange={(e) => setAgeMax(e.target.value)} />
        </label>
        <div className="full">
          <LiensEditor liens={liensList} onChange={setLiensList} disabled={busy} />
        </div>
        <label className="full">
          <span>Intervenant principal (orateur)</span>
          <input value={principal} onChange={(e) => setPrincipal(e.target.value)} placeholder="Nom de l'intervenant principal" />
        </label>
        <div className="full">
          <span>Autres intervenants</span>
          {intervenants.map((v, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginTop: 4 }}>
              <input style={{ flex: 1 }} value={v} placeholder="Nom d'un intervenant" onChange={(e) => setIntervenants(intervenants.map((x, j) => (j === i ? e.target.value : x)))} />
              <button type="button" className="btn btn-ghost btn-inline" onClick={() => setIntervenants(intervenants.length > 1 ? intervenants.filter((_, j) => j !== i) : [""])}>Retirer</button>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-inline" style={{ marginTop: 4 }} onClick={() => setIntervenants([...intervenants, ""])}>+ Ajouter un intervenant</button>
        </div>
        <div className="full">
          <span>Description</span>
          <RichEditor value={description} onChange={setDescription} disabled={busy} />
        </div>
      </div>
      {estSerie && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 13 }}>
          <input type="checkbox" checked={toucherSerie} onChange={(e) => setToucherSerie(e.target.checked)} />
          Appliquer ces détails à toute la série (chaque date garde son horaire propre).
        </label>
      )}
      <div className="form-actions" style={{ justifyContent: "flex-start", marginTop: 8 }}>
        <button type="button" className="btn btn-primary btn-inline" disabled={busy} onClick={() => void save()}>
          {busy ? "Enregistrement..." : toucherSerie ? "Enregistrer pour toute la série" : "Enregistrer les modifications"}
        </button>
      </div>
      <SerieOccurrences token={token} evenement={evenement} onChanged={onSaved} />
    </div>
  );
}
