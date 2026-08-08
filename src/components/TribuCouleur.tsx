import { useState } from "react";

import { modifierCouleurTribu } from "../api.js";

/** Hexadecimal, three or six digits. Anything else never reaches a style attribute. */
const HEXADECIMAL = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * The colour a tribe is known by, shown and changed from the tribes list.
 *
 * Members recognise their tribe by its colour before they read its name, so the
 * platform has to carry it. It is a setting rather than a constant because another
 * organisation deploying this product has its own groups, or none: a palette written
 * into the code would be this organisation's palette in everybody else's
 * application.
 *
 * The native colour input is used on purpose. It is the control every operating
 * system already gives people for this exact task, it is reachable by keyboard, and
 * it cannot produce a value that is not a colour. A hand-built palette would offer
 * fewer colours and more ways to be wrong.
 *
 * Nothing is drawn when no colour is set: a default would come to stand for a group
 * nobody assigned it to.
 */
export function TribuCouleur({ token, tribuId, couleur, canGerer, onChanged }: Readonly<{
  token: string;
  tribuId: string;
  couleur?: string | null;
  canGerer: boolean;
  onChanged: () => void;
}>): JSX.Element {
  const valeur = (couleur ?? "").trim();
  const valide = HEXADECIMAL.test(valeur);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function enregistrer(nouvelle: string): Promise<void> {
    setBusy(true);
    setErreur(null);
    try {
      await modifierCouleurTribu(token, tribuId, nouvelle);
      onChanged();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Couleur non enregistrée");
    } finally {
      setBusy(false);
    }
  }

  // The ring matters: one of these tribes is white, and a white disc on a white card
  // is a gap rather than a colour.
  const pastille = (
    <span
      aria-hidden
      style={{
        display: "inline-block", width: 16, height: 16, borderRadius: "50%",
        background: valide ? valeur : "transparent",
        border: valide ? "1px solid var(--line)" : "1px dashed var(--line)",
        boxShadow: valide ? "inset 0 0 0 1px rgba(255,255,255,.35)" : "none",
        flexShrink: 0, verticalAlign: "middle",
      }}
    />
  );

  if (!canGerer) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
        {pastille}
        <span className="muted small mono">{valide ? valeur : "sans couleur"}</span>
      </span>
    );
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
      {pastille}
      <input
        type="color"
        value={valide ? valeur : "#2a4fad"}
        disabled={busy}
        onChange={(e) => void enregistrer(e.target.value)}
        aria-label="Couleur de la tribu"
        style={{ width: 30, height: 26, padding: 0, border: "1px solid var(--line)", borderRadius: 6, background: "transparent", cursor: busy ? "wait" : "pointer" }}
      />
      {valide && (
        <button
          type="button"
          className="btn btn-ghost btn-inline"
          disabled={busy}
          onClick={() => void enregistrer("")}
          title="Retirer la couleur de cette tribu"
        >
          Retirer
        </button>
      )}
      {erreur && <span className="small" style={{ color: "var(--danger)" }}>{erreur}</span>}
    </span>
  );
}
