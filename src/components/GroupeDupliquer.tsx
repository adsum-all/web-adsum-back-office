import { useState } from "react";

import { ApiError, type GroupeAcces, dupliquerGroupe, getApplications } from "../api.js";
import { useResource } from "../useResource.js";

export interface GroupeDupliquerProps {
  token: string;
  /** The protected standard group being copied. */
  source: GroupeAcces;
  onClose: () => void;
  onDone: () => void;
}

/**
 * Copy a standard group into a custom, editable one.
 *
 * A standard group is protected on purpose: the platform relies on what it grants.
 * Rebuilding an equivalent by hand would mean re-picking dozens of permissions and
 * getting one wrong, so the copy starts from the exact same set and remembers where
 * it came from. The description is required: a copy that does not say why it exists
 * is precisely the kind of group nobody dares touch six months later.
 */
export function GroupeDupliquer({ token, source, onClose, onDone }: GroupeDupliquerProps): JSX.Element {
  const applications = useResource(() => getApplications(token), [token]);
  const [libelle, setLibelle] = useState(`${source.libelle} (copie)`);
  const [description, setDescription] = useState("");
  const [applicationCode, setApplicationCode] = useState(source.application_code ?? "");
  const [perimetre, setPerimetre] = useState("");
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<{ libelle: string; permissions_copiees: number } | null>(null);

  async function soumettre(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (libelle.trim().length < 2) {
      setErreur("Donnez un libellé d'au moins deux caractères.");
      return;
    }
    if (description.trim().length < 10) {
      setErreur("Décrivez à quoi servira cette copie : au moins dix caractères.");
      return;
    }
    setBusy(true);
    setErreur(null);
    try {
      const r = await dupliquerGroupe(token, source.id, {
        libelle: libelle.trim(),
        description: description.trim(),
        application_code: applicationCode || null,
        custom_scope: perimetre.trim() || null,
      });
      setResultat({ libelle: r.libelle, permissions_copiees: r.permissions_copiees });
    } catch (e2) {
      setErreur(e2 instanceof ApiError ? e2.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="drawer-root" role="dialog" aria-modal="true" aria-label={`Dupliquer le groupe ${source.libelle}`}>
      <div className="drawer-overlay" onClick={onClose} aria-hidden="true" />
      <div className="drawer-panel">
        <div className="drawer-head">
          <h2 className="drawer-title">Dupliquer en groupe personnalisé</h2>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Fermer">
            &times;
          </button>
        </div>

        {resultat ? (
          <div className="fiche-corps">
            <p className="banner banner-ok">
              Le groupe « {resultat.libelle} » a été créé avec {resultat.permissions_copiees} permission
              {resultat.permissions_copiees > 1 ? "s" : ""} reprises du modèle.
            </p>
            <p className="muted small">
              Il est désormais modifiable. La vue de comparaison montrera à tout moment ce qui a été ajouté
              ou retiré par rapport à « {source.libelle} ».
            </p>
            <div className="form-actions">
              <button type="button" className="btn btn-primary btn-inline" onClick={onDone}>
                Terminer
              </button>
            </div>
          </div>
        ) : (
          <form className="fiche-corps" onSubmit={soumettre}>
            <p className="banner banner-info small">
              La copie reprend exactement les permissions de « {source.libelle} » et garde le lien vers ce modèle.
              Vous pourrez ensuite en ajouter ou en retirer.
            </p>
            <label>
              <span>Libellé *</span>
              <input value={libelle} onChange={(e) => setLibelle(e.target.value)} required />
            </label>
            <label>
              <span>À quoi sert cette copie *</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Exemple : mêmes droits que le modèle, pour la direction régionale du Nord."
                style={{ width: "100%", resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
                required
              />
            </label>
            <label>
              <span>Application concernée</span>
              <select value={applicationCode} onChange={(e) => setApplicationCode(e.target.value)}>
                <option value="">Transverse (aucune application précise)</option>
                {(applications.data ?? []).map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.nom.replace(/^ADSUM\s+/i, "")}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Périmètre propre à cette copie</span>
              <input
                value={perimetre}
                onChange={(e) => setPerimetre(e.target.value)}
                placeholder="Exemple : Direction régionale du Nord"
              />
            </label>
            {erreur ? <p className="banner banner-error">{erreur}</p> : null}
            <div className="form-actions">
              <button type="submit" className="btn btn-primary btn-inline" disabled={busy}>
                {busy ? "Duplication..." : "Créer la copie"}
              </button>
              <button type="button" className="btn btn-ghost btn-inline" onClick={onClose} disabled={busy}>
                Annuler
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
