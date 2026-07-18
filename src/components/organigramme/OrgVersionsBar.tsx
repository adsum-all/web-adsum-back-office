import { useState } from "react";

import {
  ApiError,
  type OrgValidation,
  type OrganigrammeVersion,
  construireOrganigramme,
  createOrganigrammeVersion,
  deleteOrganigrammeVersion,
  publierOrganigramme,
  restaurerOrganigramme,
  validerOrganigramme,
} from "../../api.js";

const STATUT_VERSION: Record<OrganigrammeVersion["statut"], string> = {
  brouillon: "Brouillon",
  publie: "Publié",
  archive: "Archivé",
};

export interface OrgVersionsBarProps {
  token: string;
  versions: OrganigrammeVersion[];
  selected: OrganigrammeVersion | null;
  hasPublished: boolean;
  onSelect: (id: string) => void;
  /** Reload the versions list and the current draft content. */
  onChanged: () => void;
}

/** Draft lifecycle toolbar for the edit mode: pick or create a draft, rebuild it
 * from the live data, validate it (blockers and warnings are surfaced), publish it
 * when publishable, restore any version as a fresh draft, or delete a draft. Only
 * the published version is ever visible to members. */
export function OrgVersionsBar({
  token,
  versions,
  selected,
  hasPublished,
  onSelect,
  onChanged,
}: OrgVersionsBarProps): JSX.Element {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<OrgValidation | null>(null);
  const [creating, setCreating] = useState(false);
  const [libelle, setLibelle] = useState("");
  const [source, setSource] = useState<"reel" | "publie">("reel");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isDraft = selected?.statut === "brouillon";

  async function run(key: string, fn: () => Promise<void>): Promise<void> {
    setBusy(key);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur réseau");
    } finally {
      setBusy(null);
    }
  }

  async function createDraft(): Promise<void> {
    if (libelle.trim().length < 2) {
      setError("Indiquez un libellé d'au moins deux caractères.");
      return;
    }
    await run("create", async () => {
      const res = await createOrganigrammeVersion(token, { libelle: libelle.trim(), depuis: source });
      setCreating(false);
      setLibelle("");
      setValidation(null);
      onSelect(res.id);
      onChanged();
    });
  }

  return (
    <div className="org-versions">
      <div className="org-versions-row">
        <label className="org-versions-pick">
          <span>Version en cours d'édition</span>
          <select
            value={selected?.id ?? ""}
            onChange={(e) => {
              setValidation(null);
              onSelect(e.target.value);
            }}
          >
            {versions.length === 0 ? <option value="">Aucune version</option> : null}
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.libelle} ({STATUT_VERSION[v.statut]})
              </option>
            ))}
          </select>
        </label>

        <div className="org-versions-actions">
          <button type="button" className="btn btn-ghost btn-inline" onClick={() => setCreating((v) => !v)}>
            Nouveau brouillon
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-inline"
            disabled={!isDraft || busy !== null}
            onClick={() =>
              selected &&
              void run("construire", async () => {
                await construireOrganigramme(token, selected.id);
                setValidation(null);
                onChanged();
              })
            }
            title="Efface le brouillon puis le reconstruit depuis les données réelles"
          >
            {busy === "construire" ? "Reconstruction..." : "Reconstruire depuis le réel"}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-inline"
            disabled={!isDraft || busy !== null}
            onClick={() =>
              selected &&
              void run("valider", async () => {
                const v = await validerOrganigramme(token, selected.id);
                setValidation(v);
              })
            }
          >
            {busy === "valider" ? "Validation..." : "Valider"}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-inline"
            disabled={!isDraft || busy !== null || (validation !== null && !validation.publiable)}
            onClick={() =>
              selected &&
              void run("publier", async () => {
                await publierOrganigramme(token, selected.id);
                setValidation(null);
                onChanged();
              })
            }
            title={validation && !validation.publiable ? "Corrigez les points bloquants avant de publier" : "Publier ce brouillon"}
          >
            {busy === "publier" ? "Publication..." : "Publier"}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-inline"
            disabled={!selected || busy !== null}
            onClick={() =>
              selected &&
              void run("restaurer", async () => {
                const res = await restaurerOrganigramme(token, selected.id);
                onSelect(res.id);
                onChanged();
              })
            }
            title="Clone cette version dans un nouveau brouillon"
          >
            Restaurer en brouillon
          </button>
          <button
            type="button"
            className="btn btn-danger btn-inline"
            disabled={!selected || selected.statut === "publie" || busy !== null}
            onClick={() => setConfirmDelete(true)}
          >
            Supprimer
          </button>
        </div>
      </div>

      {creating ? (
        <div className="org-versions-create">
          <input
            value={libelle}
            onChange={(e) => setLibelle(e.target.value)}
            placeholder="Libellé du brouillon (ex : Organigramme 2026)"
            aria-label="Libellé du nouveau brouillon"
          />
          <label className="org-versions-source">
            <span>Point de départ</span>
            <select value={source} onChange={(e) => setSource(e.target.value as "reel" | "publie")}>
              <option value="reel">Données réelles</option>
              <option value="publie" disabled={!hasPublished}>
                Version publiée
              </option>
            </select>
          </label>
          <button type="button" className="btn btn-primary btn-inline" onClick={() => void createDraft()} disabled={busy !== null}>
            {busy === "create" ? "Création..." : "Créer"}
          </button>
        </div>
      ) : null}

      {confirmDelete && selected ? (
        <div className="org-confirm">
          <span>Supprimer définitivement la version « {selected.libelle} » ?</span>
          <div className="org-confirm-actions">
            <button type="button" className="btn btn-ghost btn-inline" onClick={() => setConfirmDelete(false)}>
              Annuler
            </button>
            <button
              type="button"
              className="btn btn-danger btn-inline"
              onClick={() =>
                void run("delete", async () => {
                  await deleteOrganigrammeVersion(token, selected.id);
                  setConfirmDelete(false);
                  setValidation(null);
                  onChanged();
                })
              }
            >
              Supprimer
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="banner banner-error">{error}</p> : null}

      {validation ? (
        <div className={`org-validation ${validation.publiable ? "is-ok" : "is-blocked"}`}>
          <p className="org-validation-head">
            {validation.publiable ? "Ce brouillon est publiable." : "Ce brouillon n'est pas encore publiable."}
          </p>
          {validation.bloquants.length > 0 ? (
            <div className="org-validation-group">
              <p className="org-validation-title">Points bloquants</p>
              <ul>
                {validation.bloquants.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {validation.avertissements.length > 0 ? (
            <div className="org-validation-group">
              <p className="org-validation-title">Avertissements</p>
              <ul>
                {validation.avertissements.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
