import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

import { getEngagementDashboard } from "../api.js";
import { useResource } from "../useResource.js";
import { EngagementImport } from "./EngagementImport.js";
import { EngagementListe } from "./EngagementListe.js";
import { EngagementSaisie } from "./EngagementSaisie.js";
import { Tabs } from "./Tabs.js";

const PUBLIC_BASE = "https://adsum-public.pages.dev";

const TABS = [
  { id: "dashboard", label: "Tableau de bord" },
  { id: "invitations", label: "Invitations" },
  { id: "saisie", label: "Saisie manuelle" },
  { id: "import", label: "Import Excel" },
  { id: "qr", label: "QR d'engagement" },
];

function DashboardTab({ token, tick }: { token: string; tick: number }): JSX.Element {
  const d = useResource(() => getEngagementDashboard(token), [token, tick]);
  const data = d.data;
  const cartes = [
    { label: "Total", value: data?.total ?? 0 },
    { label: "En attente", value: data?.en_attente ?? 0 },
    { label: "Convertis en membres", value: data?.converti ?? 0 },
  ];
  return (
    <div>
      {d.error && <p className="banner banner-error">{d.error}</p>}
      <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
        {cartes.map((c) => (
          <div key={c.label} className="form-card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 30, fontWeight: 700, color: "#2a4fad" }}>{c.value}</div>
            <div className="muted small">{c.label}</div>
          </div>
        ))}
      </div>
      <h3 className="section-title" style={{ marginTop: 16 }}>Par canal de collecte</h3>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Canal</th><th>Nombre</th></tr></thead>
          <tbody>
            {Object.entries(data?.par_canal ?? {}).length === 0 && <tr><td colSpan={2} className="muted">Aucune donnée.</td></tr>}
            {Object.entries(data?.par_canal ?? {}).map(([canal, n]) => (
              <tr key={canal}><td>{canal}</td><td>{n}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QrTab(): JSX.Element {
  const [eventId, setEventId] = useState("");
  const ref = useRef<HTMLCanvasElement>(null);
  const url = `${PUBLIC_BASE}/?engage=${encodeURIComponent(eventId.trim())}`;
  useEffect(() => {
    if (ref.current) void QRCode.toCanvas(ref.current, url, { width: 240, margin: 1 });
  }, [url]);
  return (
    <section className="form-card">
      <h2 className="section-title">QR « Je m&apos;engage »</h2>
      <p className="muted small" style={{ marginTop: 0 }}>
        Affichez ce QR lors d&apos;un événement public : en le scannant, une personne ouvre le formulaire
        d&apos;engagement. Distinct du QR de comptage. L&apos;identifiant d&apos;activité est optionnel.
      </p>
      <label className="form-field" style={{ maxWidth: 420 }}>
        <span>Identifiant d&apos;activité (optionnel)</span>
        <input value={eventId} onChange={(e) => setEventId(e.target.value)} placeholder="Coller l'id de l'activité (facultatif)" />
      </label>
      <div style={{ marginTop: 12, textAlign: "center" }}>
        <canvas ref={ref} />
        <p className="mono muted small" style={{ wordBreak: "break-all" }}>{url}</p>
      </div>
    </section>
  );
}

/**
 * "Engagement" page: capture and process people who express interest at public
 * events. Tabs follow the workflow: dashboard indicators, pending invitations with
 * bulk conversion, manual quick-entry, Excel import, and the engagement QR to show.
 */
export function EngagementAdmin({ token }: { token: string }): JSX.Element {
  const [tab, setTab] = useState("dashboard");
  const [tick, setTick] = useState(0);
  const refresh = (): void => setTick((t) => t + 1);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Engagement</h1>
          <p className="muted">
            Les personnes qui expriment leur souhait de s&apos;engager lors d&apos;un événement public. Distinctes des
            membres : une équipe les convertit ensuite en comptes membres.
          </p>
        </div>
      </header>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "dashboard" && <DashboardTab token={token} tick={tick} />}
      {tab === "invitations" && <EngagementListe token={token} onConverted={refresh} />}
      {tab === "saisie" && <EngagementSaisie token={token} onAdded={refresh} />}
      {tab === "import" && <EngagementImport token={token} onImported={refresh} />}
      {tab === "qr" && <QrTab />}
    </div>
  );
}
