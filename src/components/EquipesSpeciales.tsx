import { useState } from "react";

import {
  ApiError,
  type EquipeSpeciale,
  type MembreEquipe,
  type MembreProfile,
  addMembreEquipe,
  createEquipeSpeciale,
  deleteEquipeSpeciale,
  getMembres,
  listEquipesSpeciales,
  listMembresEquipe,
  removeMembreEquipe,
  updateEquipeSpeciale,
} from "../api.js";
import { useResource } from "../useResource.js";

// Roles a member can hold in a team; the UI restricts the choice to these two.
type RoleEquipe = "membre" | "responsable";

interface EquipeFormValue {
  nom: string;
  description: string;
  officielle: boolean;
  active: boolean;
  ordre: number;
}

function pluriel(n: number, singulier: string, pluriel: string): string {
  return n > 1 ? pluriel : singulier;
}

// Best readable name for a directory result, falling back to the matricule.
function nomMembre(m: MembreProfile): string {
  if (m.nom_affichage && m.nom_affichage.trim()) return m.nom_affichage.trim();
  const parts = [m.prenoms, m.nom].map((p) => (p ?? "").trim()).filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : m.matricule;
}

/**
 * Special teams: official cross-cutting bodies (dirigeante, college des bergers,
 * assistants du fondateur, etc.) that sit outside the hierarchy (commission,
 * intendance, tribu). A member can belong to zero, one, or several of them. This
 * page lists, creates, edits, deactivates, and deletes teams, and manages the
 * membership of each one. In read-only mode every mutation control is hidden.
 */
export function EquipesSpeciales(props: { token: string; canGerer: boolean }): JSX.Element {
  const { token, canGerer } = props;
  const equipes = useResource(() => listEquipesSpeciales(token), [token]);
  const [creation, setCreation] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [membresId, setMembresId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function creer(v: EquipeFormValue): Promise<void> {
    setError(null);
    setBusy(true);
    try {
      await createEquipeSpeciale(token, {
        nom: v.nom,
        description: v.description || undefined,
        officielle: v.officielle,
        ordre: v.ordre,
      });
      setCreation(false);
      equipes.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  async function enregistrer(id: string, v: EquipeFormValue): Promise<void> {
    setError(null);
    try {
      await updateEquipeSpeciale(token, id, {
        nom: v.nom,
        description: v.description,
        officielle: v.officielle,
        active: v.active,
        ordre: v.ordre,
      });
      setEditId(null);
      equipes.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau");
    }
  }

  async function desactiver(eq: EquipeSpeciale): Promise<void> {
    setError(null);
    try {
      await updateEquipeSpeciale(token, eq.id, { active: false });
      equipes.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau");
    }
  }

  async function supprimer(eq: EquipeSpeciale): Promise<void> {
    setError(null);
    try {
      await deleteEquipeSpeciale(token, eq.id);
      if (membresId === eq.id) setMembresId(null);
      equipes.reload();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(
          `L'équipe "${eq.nom}" compte encore des membres. Retirez les membres ou désactivez l'équipe avant de la supprimer.`,
        );
      } else {
        setError(err instanceof ApiError ? err.message : "Erreur réseau");
      }
    }
  }

  const liste = [...(equipes.data ?? [])].sort(
    (a, b) => a.ordre - b.ordre || a.nom.localeCompare(b.nom, "fr"),
  );

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Équipes spéciales</h1>
          <p className="muted">
            Groupes officiels transversaux (équipe dirigeante, collège des bergers, assistants du fondateur, etc.),
            distincts de la hiérarchie (commission, intendance, tribu). Un membre peut appartenir à aucune, une ou
            plusieurs équipes.
          </p>
        </div>
        {canGerer && !creation && (
          <button type="button" className="btn btn-primary btn-inline" onClick={() => setCreation(true)}>
            + Nouvelle équipe
          </button>
        )}
      </header>

      {!canGerer && (
        <p className="banner banner-info small">
          Vous consultez ces équipes en lecture seule. La création, la modification et la gestion des membres requièrent
          la permission de gestion.
        </p>
      )}

      {error && <p className="banner banner-error">{error}</p>}

      {canGerer && creation && (
        <EquipeForm
          submitLabel="Créer l'équipe"
          busy={busy}
          onSubmit={creer}
          onCancel={() => {
            setCreation(false);
            setError(null);
          }}
        />
      )}

      {equipes.error && <p className="banner banner-error">{equipes.error}</p>}
      {equipes.loading && !equipes.data && <p className="muted">Chargement des équipes...</p>}

      {liste.map((eq) => (
        <article key={eq.id} className="card">
          <div
            className="list-row"
            style={{ border: "none", padding: 0, background: "transparent", alignItems: "flex-start" }}
          >
            <div className="event-main">
              <strong>{eq.nom}</strong>
              {eq.description ? (
                <span className="muted small">{eq.description}</span>
              ) : (
                <span className="muted small">Aucune description.</span>
              )}
            </div>
            <div className="list-meta" style={{ flexWrap: "wrap", justifyContent: "flex-end" }}>
              <span className={eq.officielle ? "badge badge-cat-speciale" : "badge badge-mut"}>
                {eq.officielle ? "Officielle" : "Non officielle"}
              </span>
              <span className={eq.active ? "badge badge-ok" : "badge badge-bad"}>
                {eq.active ? "Active" : "Inactive"}
              </span>
              <span className="muted small">
                {eq.effectif} {pluriel(eq.effectif, "membre", "membres")}
              </span>
            </div>
          </div>

          {canGerer && editId !== eq.id && (
            <div className="org-row-actions" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="btn btn-ghost btn-inline"
                onClick={() => {
                  setEditId(eq.id);
                  setMembresId(null);
                }}
              >
                Éditer
              </button>
              <button
                type="button"
                className={membresId === eq.id ? "btn btn-ghost btn-inline is-active" : "btn btn-ghost btn-inline"}
                aria-expanded={membresId === eq.id}
                onClick={() => setMembresId(membresId === eq.id ? null : eq.id)}
              >
                {membresId === eq.id ? "Masquer les membres" : "Gérer les membres"}
              </button>
              {eq.active && (
                <button type="button" className="btn btn-ghost btn-inline" onClick={() => desactiver(eq)}>
                  Désactiver
                </button>
              )}
              <SupprimerBouton onConfirm={() => supprimer(eq)} />
            </div>
          )}

          {canGerer && editId === eq.id && (
            <EquipeForm
              edition
              initial={eq}
              submitLabel="Enregistrer"
              onCancel={() => setEditId(null)}
              onSubmit={(v) => enregistrer(eq.id, v)}
            />
          )}

          {canGerer && membresId === eq.id && (
            <MembresPanel token={token} equipeId={eq.id} onChanged={equipes.reload} />
          )}
        </article>
      ))}

      {!equipes.loading && liste.length === 0 && !equipes.error && (
        <div className="empty-card">Aucune équipe pour le moment.</div>
      )}
    </div>
  );
}

// Two-step delete: the destructive action is never a single click, no native dialog.
function SupprimerBouton({ onConfirm }: { onConfirm: () => void }): JSX.Element {
  const [armed, setArmed] = useState(false);
  if (!armed) {
    return (
      <button type="button" className="btn btn-ghost btn-inline" onClick={() => setArmed(true)}>
        Supprimer
      </button>
    );
  }
  return (
    <span className="list-meta">
      <span className="muted small">Confirmer la suppression ?</span>
      <button
        type="button"
        className="btn btn-danger btn-inline"
        onClick={() => {
          setArmed(false);
          onConfirm();
        }}
      >
        Oui, supprimer
      </button>
      <button type="button" className="btn btn-ghost btn-inline" onClick={() => setArmed(false)}>
        Annuler
      </button>
    </span>
  );
}

// Shared create/edit form. The "active" field appears only in edition mode.
function EquipeForm({
  initial,
  edition = false,
  submitLabel,
  onSubmit,
  onCancel,
  busy = false,
}: {
  initial?: EquipeSpeciale;
  edition?: boolean;
  submitLabel: string;
  onSubmit: (value: EquipeFormValue) => void;
  onCancel?: () => void;
  busy?: boolean;
}): JSX.Element {
  const [nom, setNom] = useState(initial?.nom ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [officielle, setOfficielle] = useState(initial?.officielle ?? true);
  const [active, setActive] = useState(initial?.active ?? true);
  const [ordre, setOrdre] = useState<number>(initial?.ordre ?? 0);

  return (
    <form
      className="form-card"
      style={edition ? { marginTop: 12, marginBottom: 0 } : undefined}
      onSubmit={(e) => {
        e.preventDefault();
        const n = nom.trim();
        if (!n) return;
        onSubmit({ nom: n, description: description.trim(), officielle, active, ordre });
      }}
    >
      <div className="form-grid">
        <label className="full">
          <span>Nom *</span>
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Ex : Collège des bergers"
            required
          />
        </label>
        <label className="full">
          <span>Description</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Rôle et périmètre de l'équipe (facultatif)"
          />
        </label>
        <label>
          <span>Ordre d'affichage</span>
          <input
            type="number"
            value={String(ordre)}
            onChange={(e) => setOrdre(Number.parseInt(e.target.value, 10) || 0)}
          />
        </label>
        <label className="check" style={{ alignSelf: "end" }}>
          <input type="checkbox" checked={officielle} onChange={(e) => setOfficielle(e.target.checked)} />
          Équipe officielle
        </label>
        {edition && (
          <label className="check" style={{ alignSelf: "end" }}>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Équipe active
          </label>
        )}
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary btn-inline" disabled={busy || !nom.trim()}>
          {busy ? "Enregistrement..." : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-ghost btn-inline" onClick={onCancel}>
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}

// Membership panel: current members (with remove) plus a directory search to add one.
function MembresPanel({
  token,
  equipeId,
  onChanged,
}: {
  token: string;
  equipeId: string;
  onChanged: () => void;
}): JSX.Element {
  const membres = useResource(() => listMembresEquipe(token, equipeId), [token, equipeId]);
  const [q, setQ] = useState("");
  const [resultats, setResultats] = useState<MembreProfile[]>([]);
  const [role, setRole] = useState<RoleEquipe>("membre");
  const [busy, setBusy] = useState(false);
  const [aCherche, setACherche] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const actuels: MembreEquipe[] = membres.data ?? [];
  const dejaPresents = new Set(actuels.map((m) => m.membre_id));
  const proposables = resultats.filter((m) => !dejaPresents.has(m.id));

  async function chercher(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const terme = q.trim();
    if (!terme) return;
    setBusy(true);
    setErreur(null);
    try {
      const found = await getMembres(token, { q: terme, statut: "tous", limit: 20 });
      setResultats(found);
      setACherche(true);
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  async function ajouter(m: MembreProfile): Promise<void> {
    setErreur(null);
    try {
      await addMembreEquipe(token, equipeId, m.id, role);
      setResultats((prev) => prev.filter((x) => x.id !== m.id));
      membres.reload();
      onChanged();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : "Erreur réseau");
    }
  }

  async function retirer(membreId: string): Promise<void> {
    setErreur(null);
    try {
      await removeMembreEquipe(token, equipeId, membreId);
      membres.reload();
      onChanged();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : "Erreur réseau");
    }
  }

  return (
    <section className="card" style={{ marginTop: 12, marginBottom: 0, background: "var(--adsum-board)" }}>
      <h3 className="card-title">Membres de l'équipe</h3>

      {membres.error && <p className="banner banner-error">{membres.error}</p>}
      {membres.loading && !membres.data && <p className="muted small">Chargement des membres...</p>}
      {!membres.loading && actuels.length === 0 && (
        <p className="muted small">Aucun membre dans cette équipe pour le moment.</p>
      )}

      {actuels.length > 0 && (
        <ul className="mini-list">
          {actuels.map((m) => (
            <li key={m.id}>
              <span className="event-main">
                <strong>{m.nom ?? "Membre"}</strong>
                <span className="list-meta">
                  {m.matricule && <span className="chip chip-mono">{m.matricule}</span>}
                  <span className={m.role === "responsable" ? "badge badge-warn" : "badge badge-mut"}>
                    {m.role === "responsable" ? "Responsable" : "Membre"}
                  </span>
                </span>
              </span>
              <button type="button" className="btn btn-ghost btn-inline" onClick={() => retirer(m.membre_id)}>
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}

      <form className="toolbar" style={{ marginTop: 14 }} onSubmit={chercher}>
        <input
          className="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un membre par nom"
          aria-label="Rechercher un membre par nom"
        />
        <select
          className="search"
          style={{ flex: "0 0 auto", minWidth: 160 }}
          value={role}
          onChange={(e) => setRole(e.target.value as RoleEquipe)}
          aria-label="Rôle du membre à ajouter"
        >
          <option value="membre">Ajouter comme membre</option>
          <option value="responsable">Ajouter comme responsable</option>
        </select>
        <button type="submit" className="btn btn-primary btn-inline" disabled={busy || !q.trim()}>
          {busy ? "Recherche..." : "Rechercher"}
        </button>
      </form>

      {erreur && <p className="banner banner-error">{erreur}</p>}

      {aCherche && (
        <ul className="mini-list">
          {proposables.map((m) => (
            <li key={m.id}>
              <span className="event-main">
                <strong>{nomMembre(m)}</strong>
                <span className="muted small">{m.matricule}</span>
              </span>
              <button type="button" className="btn btn-ghost btn-inline" onClick={() => ajouter(m)}>
                Ajouter
              </button>
            </li>
          ))}
          {proposables.length === 0 && (
            <li>
              <span className="muted small">Aucun membre à ajouter pour cette recherche.</span>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
