// The words every chart uses for attendance, written once.
//
// The API already computes four counts that are disjoint and add up to the whole:
// sur place, en ligne, canal non précisé, absent. The interface was not saying so. It
// drew "Venus sur place" and "Ont suivi" as two curves on one grid, which are nested,
// not comparable: somebody on site has followed, so one curve is always under the
// other and a reader cannot tell whether the gap is a third group or an overlap. And
// it labelled a series "Dont en ligne", which announces a subset while sitting beside
// what looks like a peer.
//
// A partition removes the question. Four modalities, no membership between them, and
// the four add to the number of people expected. Anything derived from them (a rate, a
// ranking) states its denominator rather than assuming the reader shares it.
//
// This file mirrors `axes_suivi.py` in the API. The predicates live there and stay
// there; what lives here is the name and the colour a reader sees, so a modality
// cannot be called one thing on one screen and another elsewhere.

/** One of the four states a person can be in for one activity. Mutually exclusive. */
export interface Modalite {
  cle: string;
  /** What a director reads. Never a word that implies membership of another modality. */
  label: string;
  /** Same idea, shortened for a cramped axis or a narrow legend. */
  court: string;
  couleur: string;
  /** One plain sentence: what had to be true for a person to land here. */
  definition: string;
}

//: Ordered from the strongest engagement to none, so a stacked column reads top to
//: bottom the way the sentence does.
export const MODALITES: readonly Modalite[] = [
  {
    cle: "presentiel",
    label: "Sur place",
    court: "Sur place",
    couleur: "#1f8a5b",
    definition: "La personne s'est déplacée et a assisté à l'activité sur le lieu.",
  },
  {
    cle: "en_ligne",
    label: "En ligne",
    court: "En ligne",
    couleur: "#0d7f96",
    definition: "La personne a suivi l'activité à distance, sans venir sur le lieu.",
  },
  {
    cle: "canal_inconnu",
    label: "A suivi, moyen non précisé",
    court: "Non précisé",
    couleur: "#8a8f9c",
    definition: "La personne a suivi l'activité mais n'a pas indiqué si c'était sur place ou en ligne.",
  },
  {
    cle: "absent",
    label: "N'a pas suivi",
    court: "Pas suivi",
    couleur: "#c0392b",
    definition: "La personne a fait savoir qu'elle n'avait suivi l'activité ni sur place ni en ligne.",
  },
  {
    cle: "sans_information",
    label: "Sans information",
    court: "Inconnu",
    couleur: "#b9bec9",
    definition:
      "La personne était attendue et n'a laissé aucune trace : ni pointage, ni réponse au sondage. "
      + "On ne sait pas si elle est venue.",
  },
] as const;

export const PAR_CLE: Readonly<Record<string, Modalite>> = Object.fromEntries(
  MODALITES.map((m) => [m.cle, m]),
);

/** The counts one activity, or one perimeter, breaks down into. */
export interface Repartition {
  presentiel: number;
  en_ligne: number;
  canal_inconnu: number;
  absent: number;
  /** Expected, no trace at all. Neither an attendance nor an absence. */
  sans_information: number;
}

/** Everybody the activity concerned. The five states add up to this. */
export function total(r: Repartition): number {
  return r.presentiel + r.en_ligne + r.canal_inconnu + r.absent + r.sans_information;
}

/** Followed by any means. The union of the first three only. */
export function ontSuivi(r: Repartition): number {
  return r.presentiel + r.en_ligne + r.canal_inconnu;
}

/** People who left a trace of any kind. The denominator of a response rate. */
export function repondants(r: Repartition): number {
  return ontSuivi(r) + r.absent;
}

/**
 * What can honestly be said about following, given that some people never answered.
 *
 * A single percentage would have to decide what the silent ones did, and there is no
 * defensible way to decide it. Counting them as absent understates; dropping them from
 * the denominator overstates, and overstates most where the response rate is worst,
 * which is exactly where a director most needs the truth.
 *
 * So two bounds. The lower one assumes nobody silent followed, the upper one assumes
 * they all did. The real figure is between them, and the gap is the price of the
 * missing answers: it narrows on its own as the survey gets answered.
 */
export function bornesSuivi(r: Repartition): { bas: number; haut: number; incertitude: number } | null {
  const n = total(r);
  if (n <= 0) return null;
  const bas = (100 * ontSuivi(r)) / n;
  const haut = (100 * (ontSuivi(r) + r.sans_information)) / n;
  return {
    bas: Math.round(bas * 10) / 10,
    haut: Math.round(haut * 10) / 10,
    incertitude: Math.round((haut - bas) * 10) / 10,
  };
}

/**
 * A rate, or nothing.
 *
 * Zero out of zero is not zero percent, it is unknown, and a dashboard that prints
 * "0 %" for an activity nobody was expected at invites a decision about a problem that
 * does not exist. Returning null forces the caller to say "pas de donnée".
 */
export function taux(numerateur: number, denominateur: number): number | null {
  if (!Number.isFinite(denominateur) || denominateur <= 0) return null;
  return Math.round((1000 * numerateur) / denominateur) / 10;
}

/**
 * The denominators in use, named, because a rate without one means nothing.
 *
 * Two of these were being mixed on the same screen. "Sur les personnes attendues" and
 * "sur les personnes qui ont répondu" give different numbers for the same reality, and
 * the second flatters: the people who never answered are exactly the ones least likely
 * to have come.
 */
export const DENOMINATEURS = {
  attendus: {
    cle: "attendus",
    label: "personnes attendues",
    definition:
      "Toutes les personnes que l'activité concernait et qui étaient déjà membres à "
      + "cette date, qu'elles aient répondu ou non. C'est le dénominateur de référence : "
      + "il ne récompense pas le silence.",
  },
  repondants: {
    cle: "repondants",
    label: "personnes ayant répondu",
    definition:
      "Seulement les personnes dont la plateforme a une trace, par pointage ou par "
      + "réponse au sondage. Un taux calculé ainsi décrit ces personnes, pas "
      + "l'organisation, et il est systématiquement plus flatteur.",
  },
} as const;
