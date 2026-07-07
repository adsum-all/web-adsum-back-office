import { useState } from "react";

import { ApiError, type Evenement, ajouterOccurrences } from "../api.js";
import { utcToZoned, zonedToUtc } from "../lib/tz.js";

type Ajout = "reguliere" | "dates";

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

/** Additive recurrence editor: append dates to an activity's series after
 * creation. A one-off becomes a series on the first append. Existing occurrences
 * (and their attendance) are never touched: the server only inserts new dates,
 * skips duplicates and caps the series length. */
export function SerieOccurrences({ token, evenement, onChanged }: { token: string; evenement: Evenement; onChanged: () => void }): JSX.Element {
  const zone = evenement.fuseau_horaire ?? "Africa/Abidjan";
  const dureeMs = evenement.fin ? new Date(evenement.fin).getTime() - new Date(evenement.debut).getTime() : 0;
  const [ajout, setAjout] = useState<Ajout>("reguliere");
  const [freq, setFreq] = useState<"quotidienne" | "hebdomadaire">("hebdomadaire");
  const [premiere, setPremiere] = useState(() => addDaysLocal(utcToZoned(evenement.debut, zone), 7));
  const [nombre, setNombre] = useState(1);
  const [dates, setDates] = useState<string[]>([addDaysLocal(utcToZoned(evenement.debut, zone), 1)]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function withFin(debutU: string): { debut: string; fin?: string } {
    const occ: { debut: string; fin?: string } = { debut: debutU };
    if (dureeMs > 0) occ.fin = new Date(new Date(debutU).getTime() + dureeMs).toISOString();
    return occ;
  }

  function build(): { debut: string; fin?: string }[] {
    if (ajout === "dates") {
      return dates.filter((d) => d).map((d) => withFin(zonedToUtc(d, zone)));
    }
    const step = freq === "hebdomadaire" ? 7 : 1;
    const n = Math.min(Math.max(1, Math.floor(nombre)), 104);
    const out: { debut: string; fin?: string }[] = [];
    for (let k = 0; k < n; k += 1) out.push(withFin(zonedToUtc(addDaysLocal(premiere, k * step), zone)));
    return out;
  }

  async function submit(): Promise<void> {
    const occurrences = build();
    if (occurrences.length === 0) {
      setError("Ajoutez au moins une date.");
      return;
    }
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const r = await ajouterOccurrences(token, evenement.id, occurrences);
      setNote(
        r.ajoutees > 0
          ? `${r.ajoutees} date(s) ajoutee(s). La serie compte desormais ${r.total} date(s).`
          : "Aucune date ajoutee (dates deja programmees ou limite de 104 atteinte).",
      );
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ajout des dates impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ borderTop: "1px dashed var(--adsum-line)", marginTop: 12, paddingTop: 12 }}>
      <p className="card-title" style={{ marginBottom: 4 }}>Répétition et dates de la série</p>
      <p className="muted small" style={{ margin: "0 0 8px" }}>
        {evenement.serie_id
          ? "Cette activité fait partie d'une série. Ajoutez d'autres dates : chaque date devient une activité réelle (pointage et questionnaire propres)."
          : "Activité unique. Ajoutez des dates pour en faire une série récurrente, sans rien perdre de l'activité actuelle."}
      </p>
      {note && <p className="banner banner-ok">{note}</p>}
      {error && <p className="banner banner-error">{error}</p>}
      <div className="form-grid">
        <label>
          <span>Ajouter par</span>
          <select value={ajout} onChange={(e) => setAjout(e.target.value as Ajout)}>
            <option value="reguliere">Rythme régulier</option>
            <option value="dates">Dates précises</option>
          </select>
        </label>
        {ajout === "reguliere" ? (
          <>
            <label>
              <span>Fréquence</span>
              <select value={freq} onChange={(e) => setFreq(e.target.value as "quotidienne" | "hebdomadaire")}>
                <option value="quotidienne">Quotidienne</option>
                <option value="hebdomadaire">Hebdomadaire</option>
              </select>
            </label>
            <label>
              <span>Première nouvelle date (heure du fuseau)</span>
              <input type="datetime-local" value={premiere} onChange={(e) => setPremiere(e.target.value)} />
            </label>
            <label>
              <span>Nombre de dates à ajouter (max 104 au total)</span>
              <input type="number" min={1} max={104} value={nombre} onChange={(e) => setNombre(Number(e.target.value))} />
            </label>
          </>
        ) : (
          <div className="full">
            {dates.map((row, i) => (
              <div key={i} className="toolbar" style={{ marginBottom: 6 }}>
                <input
                  type="datetime-local"
                  value={row}
                  style={{ flex: 1 }}
                  onChange={(e) => setDates((rows) => rows.map((x, j) => (j === i ? e.target.value : x)))}
                />
                <button type="button" className="btn btn-ghost btn-inline" onClick={() => setDates((rows) => rows.filter((_, j) => j !== i))}>
                  Retirer
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-inline" onClick={() => setDates((rows) => [...rows, addDaysLocal(utcToZoned(evenement.debut, zone), 1)])}>
              + Ajouter une date
            </button>
          </div>
        )}
      </div>
      <div className="form-actions" style={{ justifyContent: "flex-start", marginTop: 8 }}>
        <button type="button" className="btn btn-primary btn-inline" disabled={busy} onClick={() => void submit()}>
          {busy ? "Ajout..." : "Ajouter les dates à la série"}
        </button>
      </div>
    </div>
  );
}
