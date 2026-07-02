import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";

import { ApiError, type ComptageResume, addComptage, getComptage, getEvenements } from "../api.js";
import { useResource } from "../useResource.js";

const PUBLIC_BASE = (import.meta.env.VITE_PUBLIC_URL as string | undefined) ?? "https://adsum-public.pages.dev";

export function ComptageVoletB({ token }: { token: string }): JSX.Element {
  const events = useResource(() => getEvenements(token), [token]);
  const voletB = (events.data ?? []).filter((e) => e.volet === "B");
  const [eventId, setEventId] = useState("");
  const [resume, setResume] = useState<ComptageResume | null>(null);
  const [segment, setSegment] = useState("");
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function load(id: string): Promise<void> {
    setEventId(id);
    setResume(null);
    setError(null);
    if (!id) return;
    try {
      setResume(await getComptage(token, id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur reseau");
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
      setError(err instanceof ApiError ? err.message : "Erreur reseau");
    }
  }

  const publicUrl = eventId ? `${PUBLIC_BASE}/presence.html?e=${eventId}` : "";

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Comptage volet B</h1>
          <p className="muted">Grands evenements ouverts au public : membres scannes + non-membres.</p>
        </div>
      </header>

      <form className="toolbar">
        <select className="search" value={eventId} onChange={(e) => void load(e.target.value)}>
          <option value="">Choisir un événement volet B...</option>
          {voletB.map((e) => (
            <option key={e.id} value={e.id}>{e.titre}</option>
          ))}
        </select>
      </form>
      {voletB.length === 0 && !events.loading && (
        <p className="muted">Aucun événement volet B. Creez-en un dans le calendrier.</p>
      )}
      {error && <p className="banner banner-error">{error}</p>}

      {resume && (
        <>
          <div className="kpi-grid">
            <div className="kpi"><span className="kpi-label">Membres scannes</span><span className="kpi-value">{resume.membres_scannes.toLocaleString("fr-FR")}</span></div>
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
            <p className="muted small">Affichez ce QR a l'entree. Les non-membres scannent et confirment « Je suis present ».</p>
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
