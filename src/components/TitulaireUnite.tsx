import { useEffect, useState } from "react";

import {
  ApiError,
  type MembreProfile,
  type OrgEntity,
  type TitulairesUnite,
  designerTitulaire,
  getMembres,
  getTitulairesUnite,
} from "../api.js";

function nomAffiche(m: MembreProfile): string {
  return m.nom_affiche ?? m.nom_affichage ?? `${m.nom ?? ""} ${m.prenoms ?? ""}`.trim();
}

function dateCourte(v: string | null): string {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export interface TitulaireUniteProps {
  token: string;
  entity: OrgEntity;
  uniteId: string;
  uniteNom: string;
  /** Function exercised on this unit, for the wording ("Intendant", "Coordinateur"). */
  fonction?: string;
  onClose: () => void;
  onChange?: () => void;
}

/**
 * Designate or release the holder of the post on a unit.
 *
 * Four things stay distinct here, and the wording says so: the UNIT keeps its own
 * name whatever happens, the FUNCTION is what is exercised there, the POST is either
 * filled or to be filled, and the HOLDER is the member designated on it. Releasing a
 * post therefore never touches the unit: an intendance without a steward is still
 * that intendance, which is exactly what the chart used to get wrong by replacing the
 * name of the unit with the words "to be designated".
 */
export function TitulaireUnite({ token, entity, uniteId, uniteNom, fonction, onClose, onChange }: TitulaireUniteProps): JSX.Element {
  const [etat, setEtat] = useState<TitulairesUnite | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");
  const [candidats, setCandidats] = useState<MembreProfile[]>([]);
  const [busy, setBusy] = useState(false);

  const recharger = (): void => {
    getTitulairesUnite(token, entity, uniteId)
      .then(setEtat)
      .catch((e) => setErreur(e instanceof ApiError ? e.message : "Erreur réseau"));
  };

  useEffect(recharger, [token, entity, uniteId]);

  async function chercher(): Promise<void> {
    if (recherche.trim().length < 2) {
      setErreur("Saisissez au moins deux caractères.");
      return;
    }
    setErreur(null);
    try {
      setCandidats(await getMembres(token, { q: recherche.trim(), limit: 8 }));
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : "Erreur réseau");
    }
  }

  async function designer(membreId: string | null): Promise<void> {
    setBusy(true);
    setErreur(null);
    try {
      await designerTitulaire(token, entity, uniteId, membreId);
      setCandidats([]);
      setRecherche("");
      recharger();
      onChange?.();
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="drawer-root" role="dialog" aria-modal="true" aria-label={`Titulaire de ${uniteNom}`}>
      <div className="drawer-overlay" onClick={onClose} aria-hidden="true" />
      <div className="drawer-panel">
        <div className="drawer-head">
          <div>
            <h2 className="drawer-title">{uniteNom}</h2>
            <span className="muted small">{fonction ? `Poste : ${fonction}` : "Titulaire du poste"}</span>
          </div>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Fermer">
            &times;
          </button>
        </div>

        <div className="fiche-corps">
          {erreur ? <p className="banner banner-error">{erreur}</p> : null}

          {!etat ? (
            <p className="muted">Chargement...</p>
          ) : (
            <>
              <section className="fiche-bloc">
                <h3 className="fiche-bloc-titre">Situation actuelle</h3>
                <div className="titulaire-etat">
                  <span className={`badge ${etat.poste_pourvu ? "badge-ok" : "badge-mut"}`}>
                    {etat.poste_pourvu ? "Poste pourvu" : "Poste à pourvoir"}
                  </span>
                  <span className="titulaire-nom">
                    {etat.titulaire_actuel.nom ?? "Aucun titulaire désigné"}
                  </span>
                </div>
                {etat.poste_pourvu ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-inline"
                    disabled={busy}
                    onClick={() => void designer(null)}
                  >
                    Libérer le poste
                  </button>
                ) : null}
                <p className="muted small">
                  Libérer le poste ne touche pas à l&apos;unité : {uniteNom} conserve son nom et sa place, seul le
                  statut du poste change.
                </p>
              </section>

              <section className="fiche-bloc">
                <h3 className="fiche-bloc-titre">Désigner un titulaire</h3>
                <div className="form-inline">
                  <input
                    type="search"
                    value={recherche}
                    onChange={(e) => setRecherche(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void chercher();
                      }
                    }}
                    placeholder="Nom, prénom ou matricule"
                    aria-label="Rechercher un membre"
                  />
                  <button type="button" className="btn btn-ghost btn-inline" onClick={() => void chercher()}>
                    Chercher
                  </button>
                </div>
                <p className="muted small">
                  Le titulaire est un membre de l&apos;organisation. Il n&apos;a pas besoin d&apos;un compte
                  applicatif : exercer une fonction et utiliser les applications sont deux choses distinctes.
                </p>
                {candidats.length > 0 ? (
                  <ul className="titulaire-candidats">
                    {candidats.map((m) => (
                      <li key={m.id}>
                        <span>
                          <strong>{nomAffiche(m)}</strong>
                          <span className="mono muted small"> {m.matricule}</span>
                        </span>
                        <button
                          type="button"
                          className="btn btn-primary btn-inline"
                          disabled={busy}
                          onClick={() => void designer(m.id)}
                        >
                          Désigner
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>

              {etat.historique.length > 0 ? (
                <section className="fiche-bloc">
                  <h3 className="fiche-bloc-titre">Historique du poste</h3>
                  <ul className="fiche-historique">
                    {etat.historique.map((h, i) => (
                      <li key={`${h.horodatage}-${i}`}>
                        <span className="fiche-histo-date">{dateCourte(h.horodatage)}</span>
                        <span className="fiche-histo-libelle">
                          {h.libelle}
                          {h.titulaire_apres ? ` : ${h.titulaire_apres}` : ""}
                        </span>
                        <span className="muted small">{h.acteur_role ?? ""}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
