import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";

import {
  ApiError,
  type ComptageResume,
  type EvenementEligible,
  addComptage,
  getComptage,
  getEvenementsEligiblesComptage,
} from "../api.js";

const PUBLIC_BASE = (import.meta.env.VITE_PUBLIC_URL as string | undefined) ?? "https://adsum-public.pages.dev";
const PAGE = 25;

type Periode = "pertinents" | "a_venir" | "passes" | "tous";

function labelEvenement(e: EvenementEligible): string {
  const quand = e.debut ? new Date(e.debut).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "";
  const lieu = e.lieu ? `, ${e.lieu}` : "";
  return `${e.titre}${quand ? ` (${quand})` : ""}${lieu}`;
}

export function ComptageVoletB({ token }: { token: string }): JSX.Element {
  // Eligible events are fetched from the server already filtered (volet B, not cancelled),
  // searched and paginated, so the selector never downloads the whole history and stays
  // fast at any scale.
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [periode, setPeriode] = useState<Periode>("pertinents");
  const [offset, setOffset] = useState(0);
  const [eligibles, setEligibles] = useState<EvenementEligible[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingList, setLoadingList] = useState(true);

  const [eventId, setEventId] = useState("");
  const [resume, setResume] = useState<ComptageResume | null>(null);
  const [segment, setSegment] = useState("");
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Debounce the search so typing does not fire one request per keystroke.
  useEffect(() => {
    const t = window.setTimeout(() => { setDebouncedQ(q); setOffset(0); }, 300);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let alive = true;
    setLoadingList(true);
    getEvenementsEligiblesComptage(token, { q: debouncedQ || undefined, periode, limit: PAGE, offset })
      .then((r) => { if (alive) { setEligibles(r.items); setTotal(r.total); } })
      .catch((err: unknown) => { if (alive) setError(err instanceof ApiError ? err.message : "Erreur réseau"); })
      .finally(() => { if (alive) setLoadingList(false); });
    return () => { alive = false; };
  }, [token, debouncedQ, periode, offset]);

  async function load(id: string): Promise<void> {
    setEventId(id);
    setResume(null);
    setError(null);
    if (!id) return;
    try {
      setResume(await getComptage(token, id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau");
    }
  }

  async function addLine(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!eventId || count <= 0) return;
    try {
      const r = await addComptage(token, { evenement_id: eventId, segment: segment.trim() || undefined, total_anonyme: count });
      setResume(r);
      setSegment("");
      setCount(0);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau");
    }
  }

  const publicUrl = eventId ? `${PUBLIC_BASE}/presence.html?e=${eventId}` : "";

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Comptage volet B</h1>
          <p className="muted">Grands événements ouverts au public : membres scannés + non-membres.</p>
        </div>
      </header>

      <section className="card">
        <div className="toolbar" style={{ flexWrap: "wrap", gap: 8 }}>
          <input
            className="search"
            style={{ flex: 1, minWidth: 200 }}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un événement (titre, lieu)..."
            aria-label="Rechercher un événement volet B"
          />
          <select className="search" value={periode} onChange={(e) => { setPeriode(e.target.value as Periode); setOffset(0); }} aria-label="Période">
            <option value="pertinents">Récents et à venir</option>
            <option value="a_venir">À venir</option>
            <option value="passes">Passés</option>
            <option value="tous">Tous</option>
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
          <select
            className="search"
            value={eventId}
            onChange={(e) => void load(e.target.value)}
            size={Math.min(8, Math.max(2, eligibles.length + 1))}
            aria-label="Événement volet B"
          >
            <option value="">Choisir un événement volet B...</option>
            {eligibles.map((e) => (
              <option key={e.id} value={e.id}>{labelEvenement(e)}</option>
            ))}
          </select>
          <div className="toolbar" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <span className="muted small">
              {loadingList ? "Chargement..." : `${total} événement(s) volet B éligible(s)${total > PAGE ? `, affichés ${offset + 1} à ${Math.min(offset + PAGE, total)}` : ""}`}
            </span>
            {total > PAGE && (
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" className="btn btn-ghost btn-inline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>Précédent</button>
                <button type="button" className="btn btn-ghost btn-inline" disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)}>Suivant</button>
              </div>
            )}
          </div>
        </div>
        {!loadingList && total === 0 && (
          <p className="muted small" style={{ marginTop: 8 }}>
            {debouncedQ ? "Aucun événement volet B ne correspond à votre recherche." : "Aucun événement volet B éligible sur cette période. Créez-en un dans le calendrier (volet B)."}
          </p>
        )}
      </section>
      {error && <p className="banner banner-error">{error}</p>}

      {resume && (
        <>
          <div className="kpi-grid">
            <div className="kpi"><span className="kpi-label">Membres scannés</span><span className="kpi-value">{resume.membres_scannes.toLocaleString("fr-FR")}</span></div>
            <div className="kpi"><span className="kpi-label">Non-membres</span><span className="kpi-value">{resume.non_membres.toLocaleString("fr-FR")}</span></div>
            <div className="kpi"><span className="kpi-label">Total participants</span><span className="kpi-value">{resume.total_participants.toLocaleString("fr-FR")}</span></div>
          </div>

          <section className="card">
            <h2 className="card-title">Compteur manuel (non-membres)</h2>
            <form className="toolbar" onSubmit={addLine}>
              <input className="search" value={segment} onChange={(e) => setSegment(e.target.value)} placeholder="Segment (Adultes, Jeunes...)" />
              <input className="search" type="number" min={1} value={count || ""} onChange={(e) => setCount(Number(e.target.value))} placeholder="Nombre" />
              <button type="submit" className="btn btn-primary btn-inline">Ajouter</button>
            </form>
            {resume.lignes.length > 0 && (
              <ul className="list">
                {resume.lignes.map((l) => (
                  <li key={l.id} className="list-row">
                    <strong>{l.segment ?? "(self-service)"}</strong>
                    <span className="muted">{l.total_anonyme} non-membre(s)</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card">
            <h2 className="card-title">QR public self-service</h2>
            <p className="muted small">Affichez ce QR à l'entrée. Les non-membres scannent et confirment « Je suis présent ».</p>
            <PublicQr url={publicUrl} />
            <p className="mono small">{publicUrl}</p>
          </section>
        </>
      )}
    </div>
  );
}

function PublicQr({ url }: { url: string }): JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current && url) {
      void QRCode.toCanvas(ref.current, url, { width: 200, margin: 1 });
    }
  }, [url]);
  return <canvas ref={ref} width={200} height={200} aria-label="QR public" />;
}
