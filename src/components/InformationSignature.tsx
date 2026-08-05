import { useEffect, useState } from "react";

import { getFonctions } from "../api.js";
import { useMarque } from "../lib/useMarque.js";

/**
 * Who signs an information, and the shortcuts offered for it.
 *
 * Extracted from the editor, which had grown past the size this project allows. It
 * is a self-contained piece: one value, one field, and a row of suggestions that
 * needs its own fetch.
 *
 * The suggestions come from the organisation's own name and its own catalogue of
 * functions. They used to be six literals naming one organisation's roles, so a
 * parish was offered "Le Berger des Missions" to sign its announcements.
 */
export function InformationSignature({
  token,
  signature,
  signatureUrl,
  monNom,
  editable,
  onChange,
}: Readonly<{
  token: string;
  signature: string;
  signatureUrl: string;
  /** The signed-in administrator's own name, offered as a shortcut when known. */
  monNom: string;
  editable: boolean;
  onChange: (champ: "signature" | "signature_url", valeur: string) => void;
}>): JSX.Element {
  const marque = useMarque();
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    let vivant = true;
    void getFonctions(token)
      .then((fonctions) => {
        if (!vivant) return;
        setSuggestions(
          fonctions
            .filter((f) => f.actif && f.est_vip)
            .sort((a, b) => a.ordre - b.ordre)
            .slice(0, 4)
            .map((f) => f.libelle_n || f.libelle_h)
            .filter(Boolean),
        );
      })
      .catch(() => {
        // The shortcuts are a convenience. If the catalogue cannot be read, the
        // administrator still types the signature by hand.
      });
    return () => {
      vivant = false;
    };
  }, [token]);

  return (
    <>
      <div className="field">
        <span>Signature (facultative)</span>
        <input
          value={signature}
          onChange={(e) => onChange("signature", e.target.value)}
          maxLength={200}
          disabled={!editable}
          placeholder={`Ex : ${marque.organisation}`}
        />
        {editable && (
          <div className="info-auteur-btns">
            <button type="button" className="btn btn-ghost btn-inline" onClick={() => onChange("signature", marque.organisation)}>
              {marque.organisation}
            </button>
            {suggestions.map((libelle) => (
              <button key={libelle} type="button" className="btn btn-ghost btn-inline" onClick={() => onChange("signature", libelle)}>
                {libelle}
              </button>
            ))}
            {/* Kept as a literal because it names no organisation in particular:
                every one of them has an administration. */}
            <button type="button" className="btn btn-ghost btn-inline" onClick={() => onChange("signature", "L'Administration")}>
              L&apos;Administration
            </button>
            {monNom && (
              <button type="button" className="btn btn-ghost btn-inline" onClick={() => onChange("signature", monNom)}>
                Mon nom
              </button>
            )}
          </div>
        )}
      </div>
      <label className="field">
        <span>Lien de signature (site officiel, facultatif)</span>
        <input
          value={signatureUrl}
          onChange={(e) => onChange("signature_url", e.target.value)}
          placeholder={marque.site ?? "https://exemple.org"}
          disabled={!editable}
        />
      </label>
    </>
  );
}
