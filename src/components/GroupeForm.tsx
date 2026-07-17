import { useMemo, useState } from "react";

import {
  ApiError,
  type CataloguePermissions,
  type CreateGroupeInput,
  type GroupeAcces,
  type PermissionItem,
  createGroupe,
  getApplications,
  updateGroupe,
} from "../api.js";
import { useResource } from "../useResource.js";
import { PermissionDrawer } from "./PermissionDrawer.js";

// Guided template that documents a group the way the governance flow expects: which
// application(s) it serves, which concrete missions it covers, and the deadlines that
// frame those missions. Prefilled on a blank group so the intent is never left implicit.
const MODELE_DESCRIPTION =
  "Application concernée : \n" +
  "Missions / tâches : \n" +
  "Échéances : ";

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "controleur", label: "Contrôle" },
  { value: "gestionnaire", label: "Gestion des membres" },
  { value: "direction", label: "Direction" },
  { value: "admin", label: "Administration" },
  { value: "super_admin", label: "Super-administration" },
];

function slugCle(v: string): string {
  return v
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

const RISK_COLORS: Record<string, string> = {
  faible: "#2f9e44",
  moyen: "#f08c00",
  eleve: "#e8590c",
  critique: "#c92a2a",
};

/**
 * Create or edit an access group. A 'role' group grants a platform role; a
 * 'permissions' group grants an explicit permission set (picked per domain). On
 * edit, the key and mode are fixed; only label, description and, for a permissions
 * group, the granted set can change. The server still enforces least privilege.
 */
export function GroupeForm({
  token,
  catalogue,
  existing,
  onDone,
  onCancel,
}: {
  token: string;
  catalogue: CataloguePermissions;
  existing?: GroupeAcces;
  onDone: () => void;
  onCancel: () => void;
}): JSX.Element {
  const editing = Boolean(existing);
  const applications = useResource(() => getApplications(token), [token]);
  const [libelle, setLibelle] = useState(existing?.libelle ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [applicationCode, setApplicationCode] = useState(existing?.application_code ?? "");
  const [mode, setMode] = useState<"role" | "permissions">((existing?.mode as "role" | "permissions") ?? "role");
  const [roleAccorde, setRoleAccorde] = useState(existing?.role_accorde && existing.role_accorde !== "membre" ? existing.role_accorde : "gestionnaire");
  const [perms, setPerms] = useState<Set<string>>(new Set(existing?.permissions ?? []));
  const [detail, setDetail] = useState<PermissionItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const cle = editing ? existing!.cle : slugCle(libelle);

  const parDomaine = useMemo(() => {
    const map = new Map<string, PermissionItem[]>();
    for (const p of catalogue.permissions) {
      const list = map.get(p.domaine) ?? [];
      list.push(p);
      map.set(p.domaine, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [catalogue]);

  function toggle(cleP: string): void {
    setPerms((prev) => {
      const next = new Set(prev);
      if (next.has(cleP)) next.delete(cleP);
      else next.add(cleP);
      return next;
    });
  }

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!libelle.trim() || (!editing && cle.length < 2)) {
      setError("Le libellé doit donner une clé d'au moins deux lettres.");
      return;
    }
    if (mode === "permissions" && perms.size === 0) {
      setError("Un groupe de permissions doit accorder au moins une permission.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (editing) {
        await updateGroupe(token, existing!.id, {
          libelle: libelle.trim(),
          description: description.trim() || null,
          application_code: applicationCode || null,
          ...(mode === "permissions" ? { permissions: [...perms] } : {}),
        });
      } else {
        const input: CreateGroupeInput = {
          cle,
          libelle: libelle.trim(),
          description: description.trim() || null,
          application_code: applicationCode || null,
          mode,
          ...(mode === "role" ? { role_accorde: roleAccorde } : { permissions: [...perms] }),
        };
        await createGroupe(token, input);
      }
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form-card" onSubmit={submit}>
      <div className="page-head">
        <h3 className="section-title">{editing ? `Modifier « ${existing!.libelle} »` : "Nouveau groupe d'accès"}</h3>
        <button type="button" className="link" onClick={onCancel}>Fermer</button>
      </div>

      <div className="form-grid">
        <label>
          <span>Libellé *</span>
          <input value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder="Ex : Opérateur inscriptions" required />
        </label>
        <label>
          <span>Application concernée</span>
          <select value={applicationCode} onChange={(e) => setApplicationCode(e.target.value)}>
            <option value="">Transverse (aucune application précise)</option>
            {(applications.data ?? []).map((a) => (
              <option key={a.code} value={a.code}>{a.nom.replace(/^ADSUM\s+/i, "")}</option>
            ))}
          </select>
        </label>
      </div>
      {!editing && libelle.trim() && <p className="muted small">Clé technique : <span className="mono">{cle || "(invalide)"}</span></p>}

      <label style={{ display: "block", marginTop: 8 }}>
        <span>Description détaillée</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder={MODELE_DESCRIPTION}
          style={{ width: "100%", resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
        />
      </label>
      <div className="muted small" style={{ marginTop: -2, display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
        <span>Décrivez précisément l'application concernée, les tâches confiées et les échéances, pour que l'affectation soit sans ambiguïté.</span>
        {!description.trim() && (
          <button type="button" className="link" onClick={() => setDescription(MODELE_DESCRIPTION)}>
            Insérer le modèle
          </button>
        )}
      </div>

      {!editing && (
        <div className="form-grid" style={{ marginTop: 8 }}>
          <label>
            <span>Type de groupe</span>
            <select value={mode} onChange={(e) => setMode(e.target.value as "role" | "permissions")}>
              <option value="role">Accorde un rôle plateforme</option>
              <option value="permissions">Accorde des permissions précises</option>
            </select>
          </label>
          {mode === "role" && (
            <label>
              <span>Rôle accordé</span>
              <select value={roleAccorde} onChange={(e) => setRoleAccorde(e.target.value)}>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {mode === "permissions" && (
        <section style={{ marginTop: 12 }}>
          <p className="muted small">
            Cochez les permissions accordées ({perms.size} sélectionnée{perms.size > 1 ? "s" : ""}). Une permission critique
            n'est accordable que par la super-administration.
          </p>
          <div style={{ maxHeight: 320, overflowY: "auto", border: "1px solid #e6e8ef", borderRadius: 10, padding: "8px 12px" }}>
            {parDomaine.map(([domaine, items]) => (
              <div key={domaine} style={{ marginBottom: 8 }}>
                <p className="nav-group-title" style={{ margin: "6px 0 2px" }}>{domaine}</p>
                {items.map((p) => (
                  <div key={p.cle} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "5px 0" }}>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: 8, flex: 1, minWidth: 0, cursor: "pointer" }}>
                      <input type="checkbox" checked={perms.has(p.cle)} onChange={() => toggle(p.cle)} style={{ marginTop: 3 }} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span>{p.libelle}</span>
                          <span className="badge" style={{ background: RISK_COLORS[p.risque] ?? "#868e96", color: "#fff", fontSize: 11 }}>{p.risque}</span>
                          <span className="mono muted small">{p.cle}</span>
                        </span>
                        {p.description && <span className="muted small" style={{ display: "block", lineHeight: 1.35, marginTop: 1 }}>{p.description}</span>}
                        {p.limite && <span className="small" style={{ display: "block", lineHeight: 1.35, color: "#c0392b" }}>Ne permet pas : {p.limite}</span>}
                      </span>
                    </label>
                    <button type="button" className="link" style={{ flexShrink: 0, whiteSpace: "nowrap" }} onClick={() => setDetail(p)} aria-label={`Documentation de la permission ${p.libelle}`}>
                      Détails
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {error && <p className="banner banner-error" style={{ marginTop: 8 }}>{error}</p>}
      <div className="form-actions">
        <button type="submit" className="btn btn-primary btn-inline" disabled={busy}>
          {busy ? "Enregistrement..." : editing ? "Enregistrer" : "+ Créer le groupe"}
        </button>
        <button type="button" className="btn btn-ghost btn-inline" onClick={onCancel} disabled={busy}>Annuler</button>
      </div>

      <PermissionDrawer permission={detail} onClose={() => setDetail(null)} />
    </form>
  );
}
