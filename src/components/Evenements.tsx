import { useState } from "react";

import {
  ApiError,
  type CibleType,
  type EvenementCreateInput,
  createEvenement,
  getCommissions,
  getCoordinations,
  getEvenements,
  getIntendances,
  getQuestionnaireFenetre,
  getTribus,
  setQuestionnaireFenetre,
} from "../api.js";
import { formatDate } from "../format.js";
import { useResource } from "../useResource.js";
import { EvenementGestion } from "./EvenementGestion.js";
import { LiensEditor } from "./LiensEditor.js";

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
  commission: "Commission",
  intendance: "Intendance",
  tribu: "Tribu",
};

// Reference time zones offered at creation. Default is the base's home GMT zone;
// pick the activity's own zone when it takes place elsewhere.
const FUSEAUX: [string, string][] = [
  ["Africa/Abidjan", "Côte d'Ivoire (GMT)"],
  ["Europe/Paris", "France"],
  ["Europe/Brussels", "Belgique"],
  ["Africa/Dakar", "Sénégal"],
  ["Africa/Cotonou", "Bénin"],
  ["Africa/Lome", "Togo"],
  ["Africa/Ouagadougou", "Burkina Faso"],
  ["Africa/Niamey", "Niger"],
  ["Africa/Bamako", "Mali"],
  ["Africa/Douala", "Cameroun"],
  ["Africa/Lagos", "Nigéria"],
  ["Africa/Kinshasa", "RD Congo"],
  ["America/New_York", "États-Unis (Est)"],
  ["America/Toronto", "Canada (Est)"],
  ["Europe/London", "Royaume-Uni"],
];

/** Offset (ms) of an IANA zone at a given UTC instant, via Intl. */
function offsetMs(zone: string, utcMs: number): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: zone, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(new Date(utcMs))) p[part.type] = part.value;
  const n = (k: string): number => Number(p[k] ?? 0);
  const asIfUtc = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
  return asIfUtc - utcMs;
}

/** Interpret a naive "YYYY-MM-DDTHH:mm" as local to `zone`, return the UTC ISO instant. */
function zonedToUtc(local: string, zone: string): string {
  const [d = "", t = ""] = local.split("T");
  const [y = 0, mo = 1, da = 1] = d.split("-").map(Number);
  const [h = 0, mi = 0] = t.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, da, h, mi);
  // Two passes handle the DST boundary correctly.
  let off = offsetMs(zone, guess);
  off = offsetMs(zone, guess - off);
  return new Date(guess - off).toISOString();
}

export function Evenements({ token }: { token: string }): JSX.Element {
  const evenements = useResource(() => getEvenements(token), [token]);
  const fenetre = useResource(() => getQuestionnaireFenetre(token), [token]);
  // Units available as an activity target. Loaded once; the second select only
  // shows the list matching the chosen target kind.
  const coordinations = useResource(() => getCoordinations(token), [token]);
  const commissions = useResource(() => getCommissions(token), [token]);
  const intendances = useResource(() => getIntendances(token), [token]);
  const tribus = useResource(() => getTribus(token), [token]);
  const [form, setForm] = useState<EvenementCreateInput>(EMPTY);
  const [liens, setLiens] = useState<string[]>([""]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  // Local value of the questionnaire-window slider while it is being dragged, so
  // the position is persisted only once, on release, not on every tick (which
  // would flood the API and the audit log).
  const [fenetreLocal, setFenetreLocal] = useState<number | null>(null);
  const fenetreValue = fenetreLocal ?? fenetre.data?.heures ?? 6;

  function saveFenetre(heures: number): void {
    setFenetreLocal(null);
    void setQuestionnaireFenetre(token, heures).then(() => fenetre.reload()).catch(() => undefined);
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
      if (cibleType !== "general" && !form.cible_id) {
        setError("Choisissez l'unité ciblée ou repassez sur « général ».");
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
        mode: form.mode,
        type_diffusion: form.type_diffusion,
        visibilite: form.visibilite,
        cible_type: cibleType,
        cible_id: cibleType === "general" ? null : form.cible_id,
        fuseau_horaire: zone,
      };
      if (form.fin) payload.fin = zonedToUtc(form.fin, zone);
      if (form.fenetre_reponse_heures) payload.fenetre_reponse_heures = Number(form.fenetre_reponse_heures);
      if (form.lieu?.trim()) payload.lieu = form.lieu.trim();
      const cleanLiens = liens.map((l) => l.trim()).filter((l) => l.length > 0);
      if (cleanLiens.length > 0) {
        payload.liens = cleanLiens;
        payload.lien_session = cleanLiens[0];
      }
      await createEvenement(token, payload);
      setForm(EMPTY);
      setLiens([""]);
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
      </header>

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
            <span>Type</span>
            <select value={form.type ?? "rassemblement"} onChange={(e) => set("type", e.target.value)}>
              <option value="rassemblement">Rassemblement</option>
              <option value="formation">Formation</option>
              <option value="priere">Prière</option>
            </select>
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
            <span>Destinataires</span>
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
          {form.cible_type && form.cible_type !== "general" && (
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

      {evenements.error && <p className="banner banner-error">{evenements.error}</p>}
      {(evenements.data ?? []).map((ev) => (
        <section className="card" key={ev.id}>
          <div className="list-row" style={{ border: "none", background: "transparent", padding: 0 }}>
            <div className="event-main">
              <strong>{ev.titre}</strong>
              <span className="muted">{formatDate(ev.debut)}</span>
            </div>
            <div className="list-meta">
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
    </div>
  );
}
