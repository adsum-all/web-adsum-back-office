import { useEffect, useState } from "react";

import {
  ApiError,
  type ComparaisonGroupe,
  type EvenementGroupe,
  type FicheGroupe,
  type MembreDuGroupe,
  type PageApi,
  type PermissionAccordee,
  getComparaisonGroupe,
  getFicheGroupe,
  getHistoriqueGroupe,
  getMembresDuGroupe,
} from "../api.js";
import { Pagination } from "./Pagination.js";
import { Tabs } from "./Tabs.js";

const SENSIBILITE_LABEL: Record<string, string> = {
  faible: "Sensibilité faible",
  moyen: "Sensibilité moyenne",
  eleve: "Sensibilité élevée",
  critique: "Sensibilité critique",
};

const RISQUE_COULEUR: Record<string, string> = {
  faible: "#2f9e44",
  moyen: "#f08c00",
  eleve: "#e8590c",
  critique: "#c92a2a",
};

function dateCourte(v: string | null | undefined): string {
  if (!v) return "date inconnue";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? "date inconnue"
    : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

/** One permission with what it allows and what it explicitly does not. */
function LignePermission({ p }: { p: PermissionAccordee }): JSX.Element {
  return (
    <li className="fiche-perm">
      <span className="fiche-perm-tete">
        <strong>{p.libelle}</strong>
        {p.risque ? (
          <span className="badge" style={{ background: RISQUE_COULEUR[p.risque] ?? "#868e96", color: "#fff" }}>
            {p.risque}
          </span>
        ) : null}
        <span className="mono muted small">{p.cle}</span>
      </span>
      {p.description ? <span className="muted small fiche-perm-desc">{p.description}</span> : null}
      {p.limite ? <span className="small fiche-perm-limite">Ne permet pas : {p.limite}</span> : null}
    </li>
  );
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }): JSX.Element {
  return (
    <section className="fiche-bloc">
      <h3 className="fiche-bloc-titre">{titre}</h3>
      {children}
    </section>
  );
}

function Champ({ label, valeur }: { label: string; valeur: React.ReactNode }): JSX.Element {
  return (
    <div className="fiche-champ">
      <span className="fiche-champ-label">{label}</span>
      <span className="fiche-champ-valeur">{valeur ?? <span className="muted">Non renseigné</span>}</span>
    </div>
  );
}

const ONGLETS = [
  { id: "documentation", label: "Documentation" },
  { id: "permissions", label: "Permissions" },
  { id: "membres", label: "Membres" },
  { id: "historique", label: "Historique" },
];

export interface GroupeFicheProps {
  token: string;
  groupeId: string;
  onClose: () => void;
  /** Offered on a standard group, which is protected and cannot be edited. */
  onDupliquer?: (fiche: FicheGroupe) => void;
}

/**
 * Full sheet of an access group: what it is for, how far it reaches, what it grants,
 * who is in it and what happened to it. An administrator should never have to guess
 * what granting a group means, which is exactly what a label and a list of keys left
 * them doing.
 */
export function GroupeFiche({ token, groupeId, onClose, onDupliquer }: GroupeFicheProps): JSX.Element {
  const [onglet, setOnglet] = useState("documentation");
  const [fiche, setFiche] = useState<FicheGroupe | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const [membres, setMembres] = useState<PageApi<MembreDuGroupe> | null>(null);
  const [pageMembres, setPageMembres] = useState(1);
  const [tailleMembres, setTailleMembres] = useState(10);
  const [recherche, setRecherche] = useState("");

  const [historique, setHistorique] = useState<PageApi<EvenementGroupe> | null>(null);
  const [pageHisto, setPageHisto] = useState(1);

  const [comparaison, setComparaison] = useState<ComparaisonGroupe | null>(null);

  useEffect(() => {
    let vivant = true;
    getFicheGroupe(token, groupeId)
      .then((f) => {
        if (!vivant) return;
        setFiche(f);
        if (f.lignee.derive_d_un_standard) {
          getComparaisonGroupe(token, groupeId).then((c) => vivant && setComparaison(c)).catch(() => undefined);
        }
      })
      .catch((e) => vivant && setErreur(e instanceof ApiError ? e.message : "Erreur réseau"));
    return () => {
      vivant = false;
    };
  }, [token, groupeId]);

  useEffect(() => {
    if (onglet !== "membres") return;
    let vivant = true;
    getMembresDuGroupe(token, groupeId, { page: pageMembres, taille: tailleMembres, q: recherche || undefined })
      .then((p) => vivant && setMembres(p))
      .catch(() => undefined);
    return () => {
      vivant = false;
    };
  }, [token, groupeId, onglet, pageMembres, tailleMembres, recherche]);

  useEffect(() => {
    if (onglet !== "historique") return;
    let vivant = true;
    getHistoriqueGroupe(token, groupeId, { page: pageHisto, taille: 10 })
      .then((p) => vivant && setHistorique(p))
      .catch(() => undefined);
    return () => {
      vivant = false;
    };
  }, [token, groupeId, onglet, pageHisto]);

  if (erreur) return <p className="banner banner-error">{erreur}</p>;
  if (!fiche) return <p className="muted">Chargement de la fiche...</p>;

  const { identite, finalite, portee, permissions, gouvernance, lignee } = fiche;

  return (
    <div className="drawer-root" role="dialog" aria-modal="true" aria-label={`Fiche du groupe ${identite.libelle}`}>
      <div className="drawer-overlay" onClick={onClose} aria-hidden="true" />
      <div className="drawer-panel drawer-panel-large">
        <div className="drawer-head">
          <div>
            <h2 className="drawer-title">{identite.libelle}</h2>
            <span className="fiche-badges">
              <span className={`badge ${identite.type === "standard" ? "badge-mut" : "badge-ok"}`}>
                {identite.type === "standard" ? "Standard, verrouillé" : "Personnalisé"}
              </span>
              {portee.sensibilite ? (
                <span className="badge" style={{ background: RISQUE_COULEUR[portee.sensibilite] ?? "#868e96", color: "#fff" }}>
                  {SENSIBILITE_LABEL[portee.sensibilite] ?? portee.sensibilite}
                </span>
              ) : null}
              {identite.application_code ? <span className="badge badge-mut">{identite.application_code}</span> : null}
              <span className="mono muted small">{identite.cle}</span>
            </span>
          </div>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Fermer">
            &times;
          </button>
        </div>

        {gouvernance.avertissement_securite ? (
          <p className="banner banner-warn fiche-avertissement">{gouvernance.avertissement_securite}</p>
        ) : null}

        {identite.type === "standard" && onDupliquer ? (
          <div className="fiche-action-standard">
            <span className="muted small">
              Un groupe standard ne se modifie pas. Dupliquez-le pour partir de cette base et l&apos;adapter.
            </span>
            <button type="button" className="btn btn-primary btn-inline" onClick={() => onDupliquer(fiche)}>
              Dupliquer en groupe personnalisé
            </button>
          </div>
        ) : null}

        <Tabs tabs={ONGLETS} active={onglet} onChange={setOnglet} />

        {onglet === "documentation" && (
          <div className="fiche-corps">
            <Bloc titre="Identité">
              <Champ label="Description" valeur={identite.description} />
              <Champ label="État" valeur={identite.statut === "actif" ? "Actif" : "Désactivé"} />
              <Champ label="Créé le" valeur={`${dateCourte(identite.cree_le)}${identite.cree_par ? ` par ${identite.cree_par}` : ""}`} />
              <Champ label="Dernière modification" valeur={identite.maj_le ? `${dateCourte(identite.maj_le)}${identite.maj_par ? ` par ${identite.maj_par}` : ""}` : null} />
            </Bloc>
            <Bloc titre="Finalité">
              <Champ label="À quoi sert ce groupe" valeur={finalite.objectif} />
              <Champ label="Quand l'utiliser" valeur={finalite.usage_recommande} />
              <Champ label="Quand ne pas l'utiliser" valeur={finalite.usage_deconseille} />
            </Bloc>
            <Bloc titre="Portée">
              <Champ label="Périmètre" valeur={portee.texte} />
              <Champ label="Périmètre propre à cette copie" valeur={portee.custom_scope} />
            </Bloc>
            <Bloc titre="Gouvernance">
              <Champ label="Attribuer ce groupe requiert" valeur={<span className="mono">{gouvernance.attribution_requiert}</span>} />
              <Champ
                label="Le modifier requiert"
                valeur={gouvernance.modification_requiert ? <span className="mono">{gouvernance.modification_requiert}</span> : "Impossible, groupe protégé"}
              />
              <Champ label="Le dupliquer requiert" valeur={<span className="mono">{gouvernance.duplication_requiert}</span>} />
            </Bloc>
            {lignee.derive_d_un_standard && lignee.source ? (
              <Bloc titre="Filiation">
                <Champ label="Copié depuis" valeur={lignee.source.libelle} />
                <Champ label="Version du modèle utilisée" valeur={`v${lignee.source_version ?? "?"}`} />
                {comparaison ? (
                  <>
                    <Champ
                      label="Écart avec le modèle"
                      valeur={`${comparaison.resume.identiques} identique(s), ${comparaison.resume.ajoutees} ajoutée(s), ${comparaison.resume.retirees} retirée(s)`}
                    />
                    {comparaison.modele_a_evolue ? (
                      <p className="banner banner-info small">
                        Le modèle source a évolué depuis la copie (v{comparaison.source.version_actuelle}).
                      </p>
                    ) : null}
                  </>
                ) : null}
              </Bloc>
            ) : null}
          </div>
        )}

        {onglet === "permissions" && (
          <div className="fiche-corps">
            <p className="muted small">
              {permissions.mode === "role"
                ? `Ce groupe accorde le rôle ${permissions.role_accorde}, soit ${permissions.total} permission(s).`
                : `Ce groupe accorde ${permissions.total} permission(s) précises.`}
            </p>
            <ul className="fiche-perms">
              {permissions.accordees.map((p) => (
                <LignePermission key={p.cle} p={p} />
              ))}
            </ul>
          </div>
        )}

        {onglet === "membres" && (
          <div className="fiche-corps">
            <div className="form-inline">
              <input
                type="search"
                value={recherche}
                onChange={(e) => {
                  setRecherche(e.target.value);
                  setPageMembres(1);
                }}
                placeholder="Rechercher par nom ou matricule"
                aria-label="Rechercher un membre du groupe"
              />
            </div>
            {!membres ? (
              <p className="muted">Chargement...</p>
            ) : membres.items.length === 0 ? (
              <p className="muted">Aucun membre dans ce groupe.</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Membre</th>
                      <th>Portée</th>
                      <th>Depuis</th>
                      <th>État</th>
                    </tr>
                  </thead>
                  <tbody>
                    {membres.items.map((m) => (
                      <tr key={m.appartenance_id} style={{ opacity: m.actif ? 1 : 0.55 }}>
                        <td>
                          <div className="event-main">
                            <strong>{m.nom_affiche}</strong>
                            <span className="mono muted small">{m.matricule}</span>
                          </div>
                        </td>
                        <td className="muted small">{m.portee_type}</td>
                        <td className="muted small">
                          {dateCourte(m.ajoute_le)}
                          {m.ajoute_par ? <span className="muted"> par {m.ajoute_par}</span> : null}
                        </td>
                        <td>
                          <span className={`badge ${m.actif ? "badge-ok" : "badge-mut"}`}>
                            {m.actif ? "Actif" : `Retiré le ${dateCourte(m.retire_le)}`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {membres ? (
              <Pagination
                page={membres.page}
                pages={membres.pages}
                total={membres.total}
                taille={membres.taille}
                onPage={setPageMembres}
                onTaille={(t) => {
                  setTailleMembres(t);
                  setPageMembres(1);
                }}
              />
            ) : null}
          </div>
        )}

        {onglet === "historique" && (
          <div className="fiche-corps">
            {!historique ? (
              <p className="muted">Chargement...</p>
            ) : historique.items.length === 0 ? (
              <p className="muted">Aucun événement enregistré pour ce groupe.</p>
            ) : (
              <ul className="fiche-historique">
                {historique.items.map((e) => (
                  <li key={e.id}>
                    <span className="fiche-histo-date">{dateCourte(e.horodatage)}</span>
                    <span className="fiche-histo-libelle">{e.libelle}</span>
                    <span className="muted small">{e.acteur ?? e.acteur_role ?? ""}</span>
                  </li>
                ))}
              </ul>
            )}
            {historique ? (
              <Pagination
                page={historique.page}
                pages={historique.pages}
                total={historique.total}
                taille={historique.taille}
                onPage={setPageHisto}
              />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
