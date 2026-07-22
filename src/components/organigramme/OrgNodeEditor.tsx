import { useState } from "react";

import {
  ApiError,
  CATEGORIES_ATTRIBUTION,
  type MembreProfile,
  type OrgCategorie,
  type OrgNode,
  type OrgNodeType,
  type OrgStatut,
  addOrganigrammeNode,
  affecterMembreNode,
  getMembres,
  patchOrganigrammeNode,
} from "../../api.js";
import { PALETTE, STATUT_META, TYPE_NOEUD_LABEL } from "./orgLabels.js";

function displayName(m: MembreProfile): string {
  return m.nom_affiche ?? m.nom_affichage ?? `${m.nom ?? ""} ${m.prenoms ?? ""}`.trim() ?? "";
}

const STATUTS: OrgStatut[] = ["actif", "vacant", "attente", "archive"];
const TYPES: OrgNodeType[] = ["personne", "structure", "groupe"];

/** Reusable member finder: an admin binds a real member to a node instead of
 * retyping a name, so the node stays linked to the live directory. */
function MembrePicker({
  token,
  currentName,
  onPick,
  onClear,
}: {
  token: string;
  currentName: string | null;
  onPick: (m: MembreProfile) => void;
  onClear: () => void;
}): JSX.Element {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<MembreProfile[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function search(): Promise<void> {
    if (q.trim().length < 2) {
      setErr("Saisir au moins deux caractères.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const found = await getMembres(token, { q: q.trim(), limit: 8 });
      setRows(found);
      if (found.length === 0) setErr("Aucun membre trouvé.");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="org-picker">
      {currentName ? (
        <div className="org-picker-current">
          <span>Membre lié : <strong>{currentName}</strong></span>
          <button type="button" className="link" onClick={onClear}>
            Détacher
          </button>
        </div>
      ) : null}
      <div className="org-picker-search">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void search();
            }
          }}
          placeholder="Nom, prénom ou matricule"
          aria-label="Rechercher un membre à lier"
        />
        <button type="button" className="btn btn-ghost btn-inline" onClick={() => void search()} disabled={busy}>
          {busy ? "..." : "Chercher"}
        </button>
      </div>
      {err ? <p className="org-picker-err">{err}</p> : null}
      {rows.length > 0 ? (
        <ul className="org-picker-list">
          {rows.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className="org-picker-item"
                onClick={() => {
                  onPick(m);
                  setRows([]);
                  setQ("");
                }}
              >
                <span className="org-picker-name">{displayName(m)}</span>
                <span className="org-picker-mat">{m.matricule}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export interface OrgNodeEditorProps {
  token: string;
  versionId: string;
  /** Null opens the creation form; a node opens the edit form. */
  node: OrgNode | null;
  onClose: () => void;
  onSaved: () => void;
}

/** Side panel to create or edit a node. Creation exposes the full set of fields;
 * edition patches the mutable ones and keeps the node kind and category read only,
 * matching what the API accepts on PATCH. */
export function OrgNodeEditor({ token, versionId, node, onClose, onSaved }: OrgNodeEditorProps): JSX.Element {
  const editing = node !== null;
  const [nom, setNom] = useState(node?.nom ?? "");
  const [sousTitre, setSousTitre] = useState(node?.sous_titre ?? "");
  const [typeNoeud, setTypeNoeud] = useState<OrgNodeType>(node?.type_noeud ?? "personne");
  const [statut, setStatut] = useState<OrgStatut>(node?.statut ?? "actif");
  const [categorie, setCategorie] = useState<OrgCategorie>(node?.categorie ?? null);
  const [membreId, setMembreId] = useState<string | null>(node?.membre_id ?? null);
  const [membreNom, setMembreNom] = useState<string | null>(node?.membre_nom ?? (node?.membre_id ? "membre lié" : null));
  const [couleur, setCouleur] = useState<string | null>(node?.couleur ?? null);
  const [afficherPhoto, setAfficherPhoto] = useState<boolean>(node?.afficher_photo ?? false);
  const [appliquerProfil, setAppliquerProfil] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (nom.trim().length < 2) {
      setErr("Le nom doit contenir au moins deux caractères.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      if (editing && node) {
        await patchOrganigrammeNode(token, node.id, {
          nom: nom.trim(),
          sous_titre: sousTitre.trim() || null,
          statut,
          membre_id: membreId,
          couleur,
          afficher_photo: afficherPhoto,
        });
        // Optionally mirror the assignment onto the member's profile (grant the
        // function/title) via the dedicated endpoint.
        if (membreId && appliquerProfil) {
          await affecterMembreNode(token, node.id, { membre_id: membreId, appliquer_au_profil: true });
        }
      } else {
        await addOrganigrammeNode(token, versionId, {
          nom: nom.trim(),
          type_noeud: typeNoeud,
          sous_titre: sousTitre.trim() || null,
          statut,
          categorie,
          membre_id: membreId,
          couleur,
          afficher_photo: afficherPhoto,
        });
      }
      onSaved();
      onClose();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="drawer-root" role="dialog" aria-modal="true" aria-label={editing ? "Éditer un nœud" : "Ajouter un nœud"}>
      <div className="drawer-overlay" onClick={onClose} aria-hidden="true" />
      <div className="drawer-panel">
        <div className="drawer-head">
          <h2 className="drawer-title">{editing ? "Éditer le nœud" : "Nouveau nœud"}</h2>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Fermer">
            &times;
          </button>
        </div>
        <form className="org-editor-form" onSubmit={submit}>
          <label>
            <span>Nom *</span>
            <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex : Berger des missions" required />
          </label>
          <label>
            <span>Sous-titre (fonction, périmètre)</span>
            <input value={sousTitre} onChange={(e) => setSousTitre(e.target.value)} placeholder="Ex : Coordination générale" />
          </label>
          <div className="org-editor-row">
            <label>
              <span>Type de nœud</span>
              <select value={typeNoeud} onChange={(e) => setTypeNoeud(e.target.value as OrgNodeType)} disabled={editing}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_NOEUD_LABEL[t]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Statut</span>
              <select value={statut} onChange={(e) => setStatut(e.target.value as OrgStatut)}>
                {STATUTS.map((s) => (
                  <option key={s} value={s}>
                    {STATUT_META[s].label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {!editing ? (
            <label>
              <span>Catégorie (facultatif)</span>
              <select
                value={categorie ?? ""}
                onChange={(e) => setCategorie((e.target.value || null) as OrgCategorie)}
              >
                <option value="">Aucune</option>
                {CATEGORIES_ATTRIBUTION.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="org-editor-picker">
            <span className="org-editor-picker-label">Membre lié (facultatif)</span>
            <MembrePicker
              token={token}
              currentName={membreNom}
              onPick={(m) => {
                setMembreId(m.id);
                setMembreNom(displayName(m));
              }}
              onClear={() => {
                setMembreId(null);
                setMembreNom(null);
                setAppliquerProfil(false);
              }}
            />
          </div>
          {editing && membreId ? (
            <label className="org-editor-check">
              <input type="checkbox" checked={appliquerProfil} onChange={(e) => setAppliquerProfil(e.target.checked)} />
              <span>
                Appliquer au profil du membre
                <span className="muted small"> (affecte réellement cette fonction ou ce titre au membre)</span>
              </span>
            </label>
          ) : null}
          <label className="org-editor-check">
            <input type="checkbox" checked={afficherPhoto} onChange={(e) => setAfficherPhoto(e.target.checked)} />
            <span>Afficher la photo du membre sur la carte</span>
          </label>
          <div className="org-editor-picker">
            <span className="org-editor-picker-label">Couleur de la carte</span>
            <div className="org-palette" role="group" aria-label="Couleur de la carte">
              <button
                type="button"
                className={`org-swatch org-swatch-none ${couleur === null ? "is-active" : ""}`}
                onClick={() => setCouleur(null)}
                title="Aucune couleur"
                aria-label="Aucune couleur"
              />
              {PALETTE.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  className={`org-swatch ${couleur === c.hex ? "is-active" : ""}`}
                  style={{ background: c.hex }}
                  onClick={() => setCouleur(c.hex)}
                  title={c.nom}
                  aria-label={c.nom}
                />
              ))}
              <label className="org-swatch org-swatch-custom" title="Couleur personnalisée" style={{ background: couleur && !PALETTE.some((c) => c.hex === couleur) ? couleur : undefined }}>
                <input
                  type="color"
                  value={couleur ?? "#2a4fad"}
                  onChange={(e) => setCouleur(e.target.value)}
                  aria-label="Choisir une couleur personnalisée"
                  style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
                />
                <span aria-hidden="true" style={{ fontSize: 13, lineHeight: 1 }}>+</span>
              </label>
            </div>
          </div>
          {err ? <p className="banner banner-error">{err}</p> : null}
          <div className="form-actions">
            <button type="button" className="btn btn-ghost btn-inline" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary btn-inline" disabled={busy}>
              {busy ? "Enregistrement..." : editing ? "Enregistrer" : "Ajouter le nœud"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
