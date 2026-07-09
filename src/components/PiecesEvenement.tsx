import { useEffect, useState } from "react";

import {
  type PieceEvenement,
  ajouterPieceEvenement,
  listPiecesEvenement,
  supprimerPieceEvenement,
} from "../api.js";

// Attachments of an activity (images inline, files as links), same as the
// collaboration app. Backed by the shared /admin/evenements/{id}/pieces routes.
interface Props {
  token: string;
  evenementId: string;
  /** Read-only gallery: shows attachments without the add or remove controls. */
  readOnly?: boolean;
}

function lireFichier(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Lecture du fichier impossible"));
    r.readAsDataURL(f);
  });
}

export function PiecesEvenement({ token, evenementId, readOnly = false }: Props): JSX.Element {
  const [pieces, setPieces] = useState<PieceEvenement[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function charger(): void {
    listPiecesEvenement(token, evenementId).then(setPieces).catch(() => setPieces([]));
  }
  useEffect(charger, [token, evenementId]);

  async function onFichier(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 2_500_000) { setErr("Fichier trop volumineux (max 2,5 Mo)."); return; }
    setBusy(true);
    setErr(null);
    try {
      const dataUrl = await lireFichier(f);
      await ajouterPieceEvenement(token, evenementId, { nom: f.name, type: f.type, taille: f.size, data_url: dataUrl });
      charger();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Ajout impossible");
    } finally {
      setBusy(false);
    }
  }

  async function retirer(id: string): Promise<void> {
    if (!window.confirm("Retirer cette pièce ?")) return;
    await supprimerPieceEvenement(token, id);
    charger();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span>Pièces jointes (images, fichiers)</span>
      {pieces.length === 0 && <span className="muted small">Aucune pièce.</span>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {pieces.map((p) => (
          <div key={p.id} style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: 160 }}>
            {p.type.startsWith("image/") ? (
              <a href={p.url} target="_blank" rel="noopener noreferrer">
                <img src={p.url} alt={p.nom} style={{ maxWidth: 150, maxHeight: 110, borderRadius: 8, objectFit: "cover", border: "1px solid var(--adsum-line, #e2e2e2)" }} />
              </a>
            ) : (
              <a href={p.url} download={p.nom} className="btn btn-ghost btn-inline" style={{ fontSize: 13, wordBreak: "break-all" }}>{p.nom}</a>
            )}
            {!readOnly && (
              <button type="button" className="btn btn-ghost btn-inline" style={{ fontSize: 12 }} onClick={() => void retirer(p.id)}>Retirer</button>
            )}
          </div>
        ))}
      </div>
      {!readOnly && (
        <label className="btn btn-ghost btn-inline" style={{ alignSelf: "flex-start", cursor: "pointer" }}>
          {busy ? "Ajout..." : "+ Ajouter une image ou un fichier"}
          <input type="file" style={{ display: "none" }} disabled={busy} onChange={(e) => void onFichier(e)} />
        </label>
      )}
      {err && <span className="small" style={{ color: "var(--adsum-danger, #c0392b)" }}>{err}</span>}
    </div>
  );
}
