import { useEffect, useState } from "react";

import { taguerActivite, type TagItem } from "../api.js";

/**
 * Tags of one activity: what members will filter on.
 *
 * Extracted from the event panel, which had grown past the 500-line gate. The
 * selection is local to this component because nothing else in the panel reads
 * it, so keeping it here removes state from a screen that already carries a lot.
 *
 * ``initial`` is re-applied when it changes: the panel is rendered per event and
 * a stale selection would silently save one activity's tags onto another.
 */
export function EtiquettesActivite({
  token,
  evenementId,
  catalogue,
  initial,
  onSaved,
  onErreur,
}: {
  token: string;
  evenementId: string;
  catalogue: TagItem[];
  initial: string[];
  onSaved: () => void;
  onErreur: (message: string) => void;
}): JSX.Element {
  const [selection, setSelection] = useState<string[]>(initial);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const cle = initial.join(",");
  useEffect(() => {
    setSelection(cle ? cle.split(",") : []);
    setNote(null);
  }, [cle]);

  async function enregistrer(): Promise<void> {
    setBusy(true);
    setNote(null);
    try {
      await taguerActivite(token, evenementId, selection);
      setNote("Étiquettes enregistrées. Les membres pourront filtrer par ces étiquettes.");
      onSaved();
    } catch (e) {
      onErreur(e instanceof Error ? e.message : "Étiquetage impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className="card-title" style={{ margin: "14px 0 6px" }}>Étiquettes (filtrage côté membres)</p>
      {catalogue.length === 0 ? (
        <p className="muted small">Aucune étiquette au catalogue pour l&apos;instant.</p>
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {catalogue.map((tg) => {
              const on = selection.includes(tg.id);
              return (
                <button
                  key={tg.id}
                  type="button"
                  className={`btn btn-inline ${on ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setSelection((s) => (on ? s.filter((x) => x !== tg.id) : [...s, tg.id]))}
                >
                  {tg.libelle}
                </button>
              );
            })}
          </div>
          <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => void enregistrer()}>
            Enregistrer les étiquettes
          </button>
          {note && <p className="muted small" style={{ margin: "6px 0 0" }}>{note}</p>}
        </>
      )}
    </>
  );
}
