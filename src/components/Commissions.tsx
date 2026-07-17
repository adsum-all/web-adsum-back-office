import { useState } from "react";

import {
  ApiError,
  createCommission,
  createSousCommission,
  getCommissions,
  getSousCommissions,
} from "../api.js";
import { uniteLabel } from "../format.js";
import { useResource } from "../useResource.js";
import { OrgItemRow } from "./OrgItemRow.js";
import { Tabs } from "./Tabs.js";

// Built-in unit types. The administration can add any other kind by choosing
// "Autre type" and typing it: the value is stored as a lowercase slug.
const TYPES_CONNUS = ["commission", "mission"];

function slugType(v: string): string {
  return v
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);
}

function typeLabel(slug: string): string {
  const s = (slug || "commission").replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Catalogue of the community units gathered under "Commission & mission": each
 * unit carries a type (commission, mission, or a custom kind) shown as a prefix
 * before its name. Sous-commissions are managed here too, directly under their
 * parent unit, not in the coordinations/intendances area.
 */
export function Commissions({
  token,
  canCreerCommission = false,
  canGererOrg = false,
}: {
  token: string;
  // commissions.administrer: create a commission/mission (POST /admin/commissions).
  canCreerCommission?: boolean;
  // organisation.administrer: create a sous-commission (POST /admin/sous-commissions)
  // and every OrgItemRow action, routed through /admin/organisation/{entity}.
  canGererOrg?: boolean;
}): JSX.Element {
  const commissions = useResource(() => getCommissions(token), [token]);
  const sousCommissions = useResource(() => getSousCommissions(token), [token]);
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [typeChoisi, setTypeChoisi] = useState("commission");
  const [typeCustom, setTypeCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Sous-commission form state.
  const [scNom, setScNom] = useState("");
  const [scCommissionId, setScCommissionId] = useState("");
  const [scError, setScError] = useState<string | null>(null);
  const [tab, setTab] = useState<"unites" | "sous">("unites");

  const typeFinal = typeChoisi === "autre" ? slugType(typeCustom) : typeChoisi;

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!nom.trim()) return;
    if (typeChoisi === "autre" && typeFinal.length < 2) {
      setError("Indiquez un type d'au moins deux lettres (a-z).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createCommission(token, {
        nom: nom.trim(),
        description: description.trim() || undefined,
        type_organisation: typeFinal,
      });
      setNom("");
      setDescription("");
      setTypeCustom("");
      setTypeChoisi("commission");
      commissions.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  async function submitSc(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!scNom.trim()) return;
    setScError(null);
    try {
      await createSousCommission(token, { nom: scNom.trim(), commission_id: scCommissionId || undefined });
      setScNom("");
      setScCommissionId("");
      sousCommissions.reload();
    } catch (err) {
      setScError(err instanceof ApiError ? err.message : "Erreur réseau");
    }
  }

  const items = commissions.data ?? [];

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Commissions & missions</h1>
          <p className="muted">
            Une commission ou une mission a un libellé, un type et un responsable ; un membre y appartient et peut passer
            de l'une à l'autre.
          </p>
        </div>
      </header>

      {!canCreerCommission && !canGererOrg && (
        <p className="banner banner-info small">
          Vous consultez ce catalogue en lecture seule. Créer une commission requiert
          <span className="mono"> commissions.administrer</span> ; les sous-commissions et l'édition des unités requièrent
          <span className="mono"> organisation.administrer</span>.
        </p>
      )}

      <Tabs
        tabs={[{ id: "unites", label: "Commissions & missions" }, { id: "sous", label: "Sous-commissions" }]}
        active={tab}
        onChange={(id) => setTab(id as "unites" | "sous")}
      />

      {tab === "unites" && (
      <>
      {canCreerCommission && (
      <form className="form-card" onSubmit={submit}>
        <div className="form-grid">
          <label>
            <span>Type *</span>
            <select value={typeChoisi} onChange={(e) => setTypeChoisi(e.target.value)}>
              {TYPES_CONNUS.map((t) => (
                <option key={t} value={t}>{typeLabel(t)}</option>
              ))}
              <option value="autre">Autre type...</option>
            </select>
          </label>
          {typeChoisi === "autre" && (
            <label>
              <span>Nouveau type *</span>
              <input value={typeCustom} onChange={(e) => setTypeCustom(e.target.value)} placeholder="Ex : Cellule, Pole" />
            </label>
          )}
          <label>
            <span>Nom *</span>
            <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex : SAINT GABRIEL" required />
          </label>
          <label>
            <span>Description</span>
            <input value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
        </div>
        {nom.trim() && (
          <p className="muted small">Sera affiché : <strong>{typeLabel(typeFinal || "commission")} {nom.trim()}</strong></p>
        )}
        {error && <p className="banner banner-error">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-inline" disabled={busy}>
            {busy ? "Création..." : "+ Ajouter"}
          </button>
        </div>
      </form>
      )}

      {commissions.error && <p className="banner banner-error">{commissions.error}</p>}
      <ul className="list">
        {items.map((c) => (
          <OrgItemRow
            key={c.id}
            token={token}
            entity="commissions"
            id={c.id}
            nom={c.nom}
            prefix={typeLabel(c.type_organisation)}
            meta={c.description ?? undefined}
            publie={c.publie}
            edit={{ description: c.description ?? "" }}
            canGerer={canGererOrg}
            onChanged={commissions.reload}
          />
        ))}
      </ul>
      {!commissions.loading && items.length === 0 && (
        <p className="muted">Aucune unité. Créez la première.</p>
      )}
      </>
      )}

      {tab === "sous" && (
      <section className="card" style={{ marginTop: 18 }}>
        <h2 className="card-title">Sous-commissions</h2>
        <p className="muted small">Subdivisions rattachées directement à une commission ou une mission.</p>
        {canGererOrg && (
        <form className="toolbar" onSubmit={submitSc}>
          <input
            className="search"
            placeholder="Nom de la sous-commission"
            value={scNom}
            onChange={(e) => setScNom(e.target.value)}
          />
          <select className="search" value={scCommissionId} onChange={(e) => setScCommissionId(e.target.value)}>
            <option value="">Rattacher à...</option>
            {items.map((c) => (
              <option key={c.id} value={c.id}>{uniteLabel(c)}</option>
            ))}
          </select>
          <button type="submit" className="btn btn-primary btn-inline">+ Ajouter</button>
        </form>
        )}
        {scError && <p className="banner banner-error">{scError}</p>}
        <ul className="list">
          {(sousCommissions.data ?? []).map((s) => (
            <OrgItemRow
              key={s.id}
              token={token}
              entity="groupes"
              id={s.id}
              nom={s.nom}
              meta={s.commission ?? undefined}
              publie={s.publie}
              edit={{
                parent: {
                  value: s.commission_id,
                  options: items.map((c) => ({ id: c.id, nom: uniteLabel(c) })),
                  label: "Rattachée à",
                },
              }}
              canGerer={canGererOrg}
              onChanged={sousCommissions.reload}
            />
          ))}
        </ul>
      </section>
      )}
    </div>
  );
}
