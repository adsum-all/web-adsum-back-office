import { useEffect, useState } from "react";
import { type MarquePublique, getMarquePublique } from "../api.js";
import { appliquerCouleurMarque } from "./paletteMarque.js";

/**
 * The organisation's identity, fetched once and remembered.
 *
 * The sign-in screen and the header show a name and a palette before anybody has a
 * token, so those strings used to be written into the code. Every deployment of this
 * platform would then greet its members with somebody else's name.
 *
 * The last known identity is kept locally so the first paint carries the right name
 * instead of flashing a placeholder, and the values below are the ones the platform
 * shipped with, so an unreachable API still renders something coherent.
 */
const CLE = "adsum.marque";

const DEFAUT: MarquePublique = {
  marque: "ADSUM",
  initiale: "A",
  organisation: "Sacerdoce Royal",
  organisation_courte: "SR",
  slogan: null,
  logo_url: null,
  site: null,
  // Null on purpose, and not the addresses this organisation happens to use: a
  // fallback here would point every other organisation's staff at this one's
  // applications. Unset means the screen offers no link at all.
  url_membre: null,
  url_back_office: null,
  url_public: null,
  couleur: "#2a4fad",
  couleur_sombre: "#1d3470",
  mots: {},
};

/** One term in the organisation's words, with the shipped word as the fallback. */
export function mot(
  marque: MarquePublique,
  terme: string,
  facette: "singulier" | "pluriel" | "article" | "Singulier" | "Pluriel" | "avec_article" = "singulier",
  repli = "",
): string {
  const m = marque.mots?.[terme];
  return (m ? m[facette] : "") || repli || terme;
}

function charger(): MarquePublique {
  try {
    const brut = typeof localStorage !== "undefined" ? localStorage.getItem(CLE) : null;
    const m = brut ? { ...DEFAUT, ...(JSON.parse(brut) as Partial<MarquePublique>) } : DEFAUT;
    appliquerCouleurMarque(m.couleur, m.couleur_sombre);
    return m;
  } catch {
    return DEFAUT;
  }
}

let courante: MarquePublique = charger();
const abonnes = new Set<(m: MarquePublique) => void>();
let enCours: Promise<void> | null = null;

/** The identity as last known, without subscribing. For code outside a component. */
export function marqueCourante(): MarquePublique {
  return courante;
}

/** Fetch the identity at most once per page load, however many callers ask.
 *
 *  It used to fetch on every mount, so a back office showing the organisation's name
 *  in a dozen places issued a dozen requests for the same unchanging answer. */
function rafraichir(): void {
  if (enCours) return;
  enCours = getMarquePublique()
    .then((m) => {
      appliquerCouleurMarque(m.couleur, m.couleur_sombre);
      courante = m;
      try {
        localStorage.setItem(CLE, JSON.stringify(m));
      } catch {
        /* private mode: the identity stays in memory for this visit. */
      }
      for (const notifier of abonnes) notifier(m);
    })
    .catch(() => {
      // Left on the last known identity. Cleared so a later mount may retry rather
      // than the application staying on shipped defaults for the whole visit.
      enCours = null;
    });
}

export function useMarque(): MarquePublique {
  const [marque, setMarque] = useState<MarquePublique>(courante);

  useEffect(() => {
    // Another component may have received the answer between this render and this
    // effect, in which case the local copy is already stale.
    if (marque !== courante) setMarque(courante);
    abonnes.add(setMarque);
    rafraichir();
    return () => {
      abonnes.delete(setMarque);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return marque;
}
