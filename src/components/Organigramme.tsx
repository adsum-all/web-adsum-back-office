import { useEffect, useMemo, useState } from "react";

import {
  ApiError,
  type OrgContenu,
  type OrgLinkType,
  type OrgNode,
  type OrganigrammeVersion,
  addOrganigrammeLink,
  addOrganigrammeNode,
  deleteOrganigrammeLink,
  deleteOrganigrammeNode,
  getOrganigrammePublie,
  getOrganigrammeVersion,
  listOrganigrammeVersions,
  patchOrganigrammeNode,
} from "../api.js";
import { useResource } from "../useResource.js";
import { OrgCanvas } from "./organigramme/OrgCanvas.js";
import { OrgNodeEditor } from "./organigramme/OrgNodeEditor.js";
import { OrgVersionsBar } from "./organigramme/OrgVersionsBar.js";
import { LINK_META, LINK_ORDER } from "./organigramme/orgLabels.js";
import type { OrgMode } from "./organigramme/orgContext.js";

/** Load the published organigramme, turning "nothing published yet" (404) into an
 * explicit empty state instead of an error banner. */
async function loadPublieOrNull(token: string): Promise<OrgContenu | null> {
  try {
    return await getOrganigrammePublie(token);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

type PendingDelete = { kind: "node"; node: OrgNode } | { kind: "link"; id: string } | null;

export function Organigramme({
  token,
  canAdministrer = false,
}: {
  token: string;
  canAdministrer?: boolean;
}): JSX.Element {
  const [mode, setMode] = useState<OrgMode>("consultation");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorNode, setEditorNode] = useState<OrgNode | null>(null);
  const [pendingLink, setPendingLink] = useState<{ source: string; target: string } | null>(null);
  const [linkType, setLinkType] = useState<OrgLinkType>("hierarchique");
  const [linkLibelle, setLinkLibelle] = useState("");
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const editing = mode === "edition" && canAdministrer;

  const publie = useResource<OrgContenu | null>(() => loadPublieOrNull(token), [token]);
  const versions = useResource<OrganigrammeVersion[]>(
    () => (editing ? listOrganigrammeVersions(token) : Promise.resolve([])),
    [token, editing],
  );
  const contenu = useResource<OrgContenu | null>(
    () => (editing && selectedId ? getOrganigrammeVersion(token, selectedId) : Promise.resolve(null)),
    [token, editing, selectedId],
  );

  const versionList = versions.data ?? [];
  const hasPublished = versionList.some((v) => v.statut === "publie") || publie.data !== null;

  // On entering edit mode, land on a draft to work on (a draft first), so the
  // canvas is never empty when versions exist.
  useEffect(() => {
    if (!editing) return;
    if (versionList.length === 0) {
      setSelectedId(null);
      return;
    }
    const stillThere = selectedId && versionList.some((v) => v.id === selectedId);
    if (!stillThere) {
      const draft = versionList.find((v) => v.statut === "brouillon");
      setSelectedId((draft ?? versionList[0])?.id ?? null);
    }
  }, [editing, versionList, selectedId]);

  const selectedVersion = useMemo(
    () => versionList.find((v) => v.id === selectedId) ?? null,
    [versionList, selectedId],
  );

  async function withAction(fn: () => Promise<void>): Promise<void> {
    setActionBusy(true);
    setActionErr(null);
    try {
      await fn();
    } catch (e) {
      setActionErr(e instanceof ApiError ? e.message : "Erreur réseau");
    } finally {
      setActionBusy(false);
    }
  }

  function persistMove(id: string, x: number, y: number): void {
    void patchOrganigrammeNode(token, id, { pos_x: x, pos_y: y }).catch(() => undefined);
  }

  function addSeparator(): void {
    if (!selectedId) return;
    void withAction(async () => {
      await addOrganigrammeNode(token, selectedId, { nom: "Séparation", type_noeud: "separateur" });
      contenu.reload();
    });
  }

  function autoLayout(positions: { id: string; x: number; y: number }[]): void {
    void withAction(async () => {
      await Promise.all(positions.map((p) => patchOrganigrammeNode(token, p.id, { pos_x: p.x, pos_y: p.y })));
      contenu.reload();
    });
  }

  async function confirmDelete(): Promise<void> {
    if (!pendingDelete) return;
    await withAction(async () => {
      if (pendingDelete.kind === "node") await deleteOrganigrammeNode(token, pendingDelete.node.id);
      else await deleteOrganigrammeLink(token, pendingDelete.id);
      setPendingDelete(null);
      contenu.reload();
    });
  }

  async function confirmLink(): Promise<void> {
    if (!pendingLink || !selectedId) return;
    await withAction(async () => {
      await addOrganigrammeLink(token, selectedId, {
        source_id: pendingLink.source,
        cible_id: pendingLink.target,
        type_lien: linkType,
        libelle: linkLibelle.trim() || null,
      });
      setPendingLink(null);
      setLinkLibelle("");
      contenu.reload();
    });
  }

  const active = editing ? contenu.data : publie.data;
  const loading = editing ? contenu.loading || versions.loading : publie.loading;
  const loadError = editing ? versions.error ?? contenu.error : publie.error;
  const isEmpty = !loading && (active === null || active.noeuds.length === 0);

  return (
    <div className="page org-page">
      <header className="page-head">
        <div>
          <h1>Organigramme hiérarchique</h1>
          <p className="muted">
            Cartographie vivante de la gouvernance : consultez la version publiée ou construisez un brouillon
            administrable, publié en un geste pour les membres.
          </p>
        </div>
        {canAdministrer ? (
          <div className="org-modes" role="tablist" aria-label="Mode d'affichage">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "consultation"}
              className={`org-mode-btn ${mode === "consultation" ? "is-active" : ""}`}
              onClick={() => setMode("consultation")}
            >
              Consultation
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "edition"}
              className={`org-mode-btn ${mode === "edition" ? "is-active" : ""}`}
              onClick={() => setMode("edition")}
            >
              Édition
            </button>
          </div>
        ) : null}
      </header>

      {editing ? (
        <OrgVersionsBar
          token={token}
          versions={versionList}
          selected={selectedVersion}
          hasPublished={hasPublished}
          onSelect={setSelectedId}
          onChanged={() => {
            versions.reload();
            contenu.reload();
          }}
        />
      ) : null}

      <div className="org-toolbar-edit">
        {editing && selectedId ? (
          <button
            type="button"
            className="btn btn-primary btn-inline"
            onClick={() => {
              setEditorNode(null);
              setEditorOpen(true);
            }}
          >
            + Ajouter un nœud
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn-ghost btn-inline"
          onClick={() => {
            if (typeof window !== "undefined") window.print();
          }}
          title="Ouvrir l'aperçu d'impression pour enregistrer en PDF ou imprimer"
        >
          Imprimer / Exporter en PDF
        </button>
        {editing && selectedId ? (
          <span className="muted small">
            Glissez un nœud pour le repositionner. Tirez d'un bord à l'autre pour créer un lien. Cliquez un lien pour le
            supprimer.
          </span>
        ) : null}
      </div>

      {actionErr ? <p className="banner banner-error">{actionErr}</p> : null}
      {loadError ? <p className="banner banner-error">{loadError}</p> : null}

      {loading ? (
        <div className="org-canvas-wrap org-canvas-state">
          <p className="muted">Chargement de l'organigramme...</p>
        </div>
      ) : isEmpty ? (
        <div className="org-canvas-wrap org-canvas-state">
          <div className="org-empty">
            <p className="org-empty-title">
              {editing ? "Ce brouillon ne contient encore aucun nœud." : "Aucun organigramme n'est publié pour le moment."}
            </p>
            <p className="muted">
              {editing
                ? "Reconstruisez depuis les données réelles, ou ajoutez un premier nœud."
                : canAdministrer
                  ? "Passez en mode Édition pour construire puis publier un organigramme."
                  : "Il sera disponible dès qu'un administrateur l'aura publié."}
            </p>
          </div>
        </div>
      ) : active ? (
        <div className="org-canvas-wrap">
          <OrgCanvas
            key={editing ? `draft-${active.version.id}` : "publie"}
            contenu={active}
            mode={editing ? "edition" : "consultation"}
            onNodeMoved={editing ? persistMove : undefined}
            onEditNode={
              editing
                ? (n) => {
                    setEditorNode(n);
                    setEditorOpen(true);
                  }
                : undefined
            }
            onDeleteNode={editing ? (n) => setPendingDelete({ kind: "node", node: n }) : undefined}
            onConnectLink={editing ? (source, target) => setPendingLink({ source, target }) : undefined}
            onDeleteLink={editing ? (id) => setPendingDelete({ kind: "link", id }) : undefined}
            onAddSeparator={editing ? addSeparator : undefined}
            onAutoLayout={editing ? autoLayout : undefined}
          />
        </div>
      ) : null}

      {editorOpen && editing && selectedId ? (
        <OrgNodeEditor
          token={token}
          versionId={selectedId}
          node={editorNode}
          onClose={() => setEditorOpen(false)}
          onSaved={() => contenu.reload()}
        />
      ) : null}

      {pendingLink ? (
        <div className="org-modal-root" role="dialog" aria-modal="true" aria-label="Créer un lien">
          <div className="org-modal-overlay" onClick={() => setPendingLink(null)} aria-hidden="true" />
          <div className="org-modal">
            <h2 className="org-modal-title">Créer un lien</h2>
            <label className="org-modal-field">
              <span>Type de lien</span>
              <select value={linkType} onChange={(e) => setLinkType(e.target.value as OrgLinkType)}>
                {LINK_ORDER.map((t) => (
                  <option key={t} value={t}>
                    {LINK_META[t].label}
                  </option>
                ))}
              </select>
            </label>
            <p className="muted small">{LINK_META[linkType].description}</p>
            <label className="org-modal-field">
              <span>Libellé (facultatif)</span>
              <input value={linkLibelle} onChange={(e) => setLinkLibelle(e.target.value)} placeholder="Ex : coordination" />
            </label>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost btn-inline" onClick={() => setPendingLink(null)}>
                Annuler
              </button>
              <button type="button" className="btn btn-primary btn-inline" onClick={() => void confirmLink()} disabled={actionBusy}>
                {actionBusy ? "Création..." : "Créer le lien"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingDelete ? (
        <div className="org-modal-root" role="dialog" aria-modal="true" aria-label="Confirmer la suppression">
          <div className="org-modal-overlay" onClick={() => setPendingDelete(null)} aria-hidden="true" />
          <div className="org-modal">
            <h2 className="org-modal-title">Confirmer la suppression</h2>
            <p>
              {pendingDelete.kind === "node"
                ? `Supprimer le nœud « ${pendingDelete.node.nom} » ? Ses liens seront retirés.`
                : "Supprimer ce lien de l'organigramme ?"}
            </p>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost btn-inline" onClick={() => setPendingDelete(null)}>
                Annuler
              </button>
              <button type="button" className="btn btn-danger btn-inline" onClick={() => void confirmDelete()} disabled={actionBusy}>
                {actionBusy ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
