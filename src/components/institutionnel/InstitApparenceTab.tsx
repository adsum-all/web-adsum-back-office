import { useEffect, useState } from "react";

import { getIntegrations, setIntegration } from "../../api.js";

/**
 * The organisation's visual identity, chosen and seen at once.
 *
 * The colour was already configurable: it drives the whole palette of every application
 * and the header of every e-mail. But it was reachable only as one text field among
 * ninety six settings, with no way to see the result before saving. Somebody choosing
 * their organisation's colour had to type a hex code, save, reload another application
 * and judge. Most never tried.
 *
 * The preview shows the pieces the colour actually lands on, on both grounds, because a
 * blue that reads well on white can vanish on the dark theme and nobody discovers that
 * from a swatch.
 */

const CLES = {
  principale: "org_couleur_principale",
  sombre: "org_couleur_sombre",
  logo: "org_logo_url",
  banniere: "org_banniere_url",
} as const;

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Relative luminance, for the contrast check below. */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const canal = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (canal[0] ?? 0) + 0.7152 * (canal[1] ?? 0) + 0.0722 * (canal[2] ?? 0);
}

/** Contrast ratio against white, which is what sits on a coloured button. */
function contrasteSurBlanc(hex: string): number {
  if (!HEX.test(hex)) return 0;
  return Math.round(((1.05) / (luminance(hex) + 0.05)) * 100) / 100;
}

export function InstitApparenceTab({ token, canGerer }: { token: string; canGerer: boolean }): JSX.Element {
  const [valeurs, setValeurs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    void getIntegrations(token)
      .then((lignes) => {
        const trouve: Record<string, string> = {};
        for (const l of lignes) {
          if (Object.values(CLES).includes(l.cle as (typeof CLES)[keyof typeof CLES])) {
            trouve[l.cle] = l.valeur_masquee ?? "";
          }
        }
        setValeurs(trouve);
      })
      .catch((e: unknown) => setErreur(e instanceof Error ? e.message : "Erreur réseau"));
  }, [token]);

  const principale = valeurs[CLES.principale] || "#2a4fad";
  const sombre = valeurs[CLES.sombre] || "#1d3470";
  const contraste = contrasteSurBlanc(principale);
  // 4.5 is the WCAG AA threshold for normal text. A button label sits on this colour,
  // so below it the label is hard to read for anybody and unreadable for some.
  const contrasteFaible = contraste > 0 && contraste < 4.5;

  async function enregistrer(cle: string, valeur: string): Promise<void> {
    setBusy(true);
    setErreur(null);
    setNote(null);
    try {
      await setIntegration(token, cle, valeur);
      setNote("Enregistré. Les applications prennent la nouvelle valeur au prochain chargement.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2>Apparence de l&apos;organisation</h2>
      <p className="muted small" style={{ margin: "0 0 14px" }}>
        Une seule couleur est demandée : toutes les nuances des applications en sont
        dérivées. Elle apparaît sur les boutons, les pastilles et l&apos;en-tête des
        courriels envoyés aux membres.
      </p>

      {erreur && <p className="banner banner-error">{erreur}</p>}
      {note && <p className="banner banner-ok">{note}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        <label className="fe-champ">
          <span className="fe-champ-titre">Couleur principale</span>
          <span className="fe-champ-aide">Celle des boutons et des liens.</span>
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="color"
              value={HEX.test(principale) ? principale : "#2a4fad"}
              disabled={!canGerer || busy}
              onChange={(e) => setValeurs({ ...valeurs, [CLES.principale]: e.target.value })}
              onBlur={(e) => void enregistrer(CLES.principale, e.target.value)}
              style={{ width: 52, height: 38, padding: 2, border: "1px solid var(--adsum-line)", borderRadius: 8 }}
            />
            <input
              className="search mono"
              value={principale}
              disabled={!canGerer || busy}
              onChange={(e) => setValeurs({ ...valeurs, [CLES.principale]: e.target.value })}
              onBlur={(e) => HEX.test(e.target.value) && void enregistrer(CLES.principale, e.target.value)}
            />
          </span>
        </label>

        <label className="fe-champ">
          <span className="fe-champ-titre">Couleur sombre</span>
          <span className="fe-champ-aide">Pour les fonds profonds et les survols.</span>
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="color"
              value={HEX.test(sombre) ? sombre : "#1d3470"}
              disabled={!canGerer || busy}
              onChange={(e) => setValeurs({ ...valeurs, [CLES.sombre]: e.target.value })}
              onBlur={(e) => void enregistrer(CLES.sombre, e.target.value)}
              style={{ width: 52, height: 38, padding: 2, border: "1px solid var(--adsum-line)", borderRadius: 8 }}
            />
            <input
              className="search mono"
              value={sombre}
              disabled={!canGerer || busy}
              onChange={(e) => setValeurs({ ...valeurs, [CLES.sombre]: e.target.value })}
              onBlur={(e) => HEX.test(e.target.value) && void enregistrer(CLES.sombre, e.target.value)}
            />
          </span>
        </label>
      </div>

      {contrasteFaible && (
        <p className="banner banner-warn" style={{ marginTop: 12 }}>
          Contraste de {contraste} pour un texte blanc sur cette couleur. En dessous de
          4,5 le libellé d&apos;un bouton devient difficile à lire, et illisible pour une
          partie des lecteurs. Une teinte plus foncée résout cela sans changer la couleur.
        </p>
      )}

      <p className="card-title" style={{ margin: "18px 0 8px" }}>Ce que le membre verra</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        {[
          { fond: "#ffffff", encre: "#16181d", ligne: "#e3e5ea", nom: "Thème clair" },
          { fond: "#13151b", encre: "#eceef2", ligne: "#2a2e38", nom: "Thème sombre" },
        ].map((theme) => (
          <div
            key={theme.nom}
            style={{
              background: theme.fond, color: theme.encre, border: `1px solid ${theme.ligne}`,
              borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 10,
            }}
          >
            <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", opacity: 0.6 }}>
              {theme.nom}
            </span>
            <span
              style={{
                background: `linear-gradient(135deg, ${principale}, ${sombre})`,
                color: "#fff", borderRadius: 10, padding: "12px 14px", fontWeight: 700,
              }}
            >
              En-tête de courriel
            </span>
            <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                style={{ background: principale, color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 600, cursor: "default" }}
              >
                Confirmer
              </button>
              <span style={{ background: `${principale}22`, color: principale, borderRadius: 999, padding: "4px 11px", fontSize: 12, fontWeight: 600 }}>
                Pastille
              </span>
              <a href="#apercu" style={{ color: principale, fontWeight: 600, fontSize: 13 }} onClick={(e) => e.preventDefault()}>
                Un lien
              </a>
            </span>
          </div>
        ))}
      </div>

      <p className="card-title" style={{ margin: "18px 0 8px" }}>Images</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {[
          { cle: CLES.logo, titre: "Logo", aide: "Affiché dans l'en-tête des applications et des courriels." },
          { cle: CLES.banniere, titre: "Bannière", aide: "Image large, en tête des pages publiques." },
        ].map((champ) => (
          <label key={champ.cle} className="fe-champ">
            <span className="fe-champ-titre">{champ.titre}</span>
            <span className="fe-champ-aide">{champ.aide}</span>
            <input
              className="search"
              placeholder="https://..."
              value={valeurs[champ.cle] ?? ""}
              disabled={!canGerer || busy}
              onChange={(e) => setValeurs({ ...valeurs, [champ.cle]: e.target.value })}
              onBlur={(e) => void enregistrer(champ.cle, e.target.value)}
            />
            {valeurs[champ.cle] && (
              <img
                src={valeurs[champ.cle]}
                alt={`Aperçu : ${champ.titre.toLowerCase()}`}
                style={{ maxWidth: "100%", maxHeight: 90, marginTop: 8, objectFit: "contain", borderRadius: 8 }}
                // A broken URL must say so rather than leave a silent gap that reads as
                // "no logo configured".
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            )}
          </label>
        ))}
      </div>

      {!canGerer && (
        <p className="muted small" style={{ margin: "14px 0 0" }}>
          Lecture seule : modifier l&apos;apparence demande la permission de gérer les paramètres.
        </p>
      )}
    </section>
  );
}
