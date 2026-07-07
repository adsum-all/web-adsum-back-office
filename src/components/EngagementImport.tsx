import { useRef, useState } from "react";

import { ApiError, type EngagementImportResult, downloadEngagementTemplate, importEngagement } from "../api.js";

/**
 * Excel (.xlsx) import for engagement leads: download the exact template, fill it,
 * upload it. Duplicates (in the file or already captured) are skipped and reported;
 * one bad row never aborts the import. Excel only, never CSV.
 */
export function EngagementImport({ token, onImported }: { token: string; onImported?: () => void }): JSX.Element {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"" | "template" | "import">("");
  const [res, setRes] = useState<EngagementImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function telechargerModele(): Promise<void> {
    setBusy("template");
    setError(null);
    try {
      await downloadEngagementTemplate(token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Modèle indisponible");
    } finally {
      setBusy("");
    }
  }

  async function importer(): Promise<void> {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choisissez un fichier .xlsx.");
      return;
    }
    setBusy("import");
    setError(null);
    setRes(null);
    try {
      const r = await importEngagement(token, file);
      setRes(r);
      if (fileRef.current) fileRef.current.value = "";
      if (r.crees > 0) onImported?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Import impossible");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="form-card">
      <h2 className="section-title">Import Excel</h2>
      <p className="muted small" style={{ marginTop: 0 }}>
        Téléchargez le modèle, remplissez une personne par ligne (e-mail, prénoms, nom, téléphone, indicatif, code
        pays), puis importez le fichier <span className="mono">.xlsx</span>. Format Excel uniquement, pas de CSV.
      </p>
      <div className="form-actions" style={{ justifyContent: "flex-start" }}>
        <button type="button" className="btn btn-ghost btn-inline" disabled={busy === "template"} onClick={() => void telechargerModele()}>
          {busy === "template" ? "..." : "Télécharger le modèle .xlsx"}
        </button>
      </div>
      <div className="form-inline" style={{ marginTop: 8 }}>
        <input ref={fileRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
        <button type="button" className="btn btn-primary btn-inline" disabled={busy === "import"} onClick={() => void importer()}>
          {busy === "import" ? "Import..." : "Importer"}
        </button>
      </div>
      {error && <p className="banner banner-error">{error}</p>}
      {res && (
        <div style={{ marginTop: 12 }}>
          <p className="banner banner-ok">{res.crees} enregistré{res.crees > 1 ? "s" : ""}.</p>
          {res.doublons.length > 0 && (
            <p className="banner banner-warn">{res.doublons.length} doublon{res.doublons.length > 1 ? "s" : ""} ignoré{res.doublons.length > 1 ? "s" : ""}.</p>
          )}
          {res.erreurs.length > 0 && (
            <div className="banner banner-error">
              {res.erreurs.length} erreur{res.erreurs.length > 1 ? "s" : ""} :
              <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                {res.erreurs.slice(0, 10).map((e) => (
                  <li key={e.email} className="small">{e.email} : {e.raison}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
