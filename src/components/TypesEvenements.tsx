import { useEffect, useState } from "react";

import {
  ApiError,
  type TypeEvenement,
  createTypeEvenement,
  deleteTypeEvenement,
  getCouleurSuggeree,
  getTypesEvenements,
  updateTypeEvenement,
} from "../api.js";
import { useResource } from "../useResource.js";

/**
 * Administrable catalogue of standard/recurring events. Each type carries a UNIQUE
 * colour (never duplicated) that distinguishes its events on the member calendar.
 * A new type auto-picks an unused colour (editable). Full lifecycle: create, edit
 * name/description/colour, publish/unpublish, delete. Nothing is hardcoded: the list
 * lives in the database and is what the planning dropdowns read.
 */
export function TypesEvenements({ token }: { token: string }): JSX.Element {
  const types = useResource(() => getTypesEvenements(token), [token]);
  const [error, setError] = useState<string | null>(null);
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [couleur, setCouleur] = useState("#2563EB");
  const [q, setQ] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  // Seed the create form with an unused colour so two types never collide by default.
  useEffect(() => {
    getCouleurSuggeree(token).then((r) => setCouleur(r.couleur)).catch(() => undefined);
  }, [token]);

  function guard<T>(p: Promise<T>, done?: () => void): void {
    setError(null);
    p.then(() => {
      types.reload();
      done?.();
    }).catch((e: unknown) => setError(e instanceof ApiError ? e.message : "Erreur réseau"));
  }

  function ajouter(e: React.FormEvent): void {
    e.preventDefault();
    const n = nom.trim();
    if (!n) return;
    guard(
      createTypeEvenement(token, { nom: n, description: description.trim() || undefined, couleur }),
      () => {
        setNom("");
        setDescription("");
        getCouleurSuggeree(token).then((r) => setCouleur(r.couleur)).catch(() => undefined);
      },
    );
  }

  const items = (types.data ?? []).filter((t) => match(t.nom, q) || match(t.code, q));

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Types d'événements</h1>
          <p className="muted">
            Catalogue paramétrable des événements standards et récurrents. Chaque type porte une couleur unique qui
            distingue ses événements sur le calendrier des membres, et se choisit en liste déroulante lors de la
            planification.
          </p>
        </div>
      </header>
      {error && <p className="banner banner-error">{error}</p>}

      <section className="card">
        <h2 className="card-title">Nouveau type d'événement</h2>
        <form className="form-card" onSubmit={ajouter}>
          <div className="form-grid">
            <label>
              <span>Nom *</span>
              <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex : SÉMINAIRE" required />
            </label>
            <label>
              <span>Description</span>
              <input value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
            <label>
              <span>Couleur (unique)</span>
              <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="color"
                  value={couleur}
                  onChange={(e) => setCouleur(e.target.value.toUpperCase())}
                  style={{ width: 44, height: 34, padding: 0, border: "none", background: "transparent", cursor: "pointer" }}
                  aria-label="Choisir une couleur"
                />
                <input
                  value={couleur}
                  onChange={(e) => setCouleur(e.target.value.toUpperCase())}
                  style={{ width: 110, fontFamily: "monospace" }}
                  aria-label="Code couleur hexadécimal"
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-inline"
                  onClick={() => getCouleurSuggeree(token).then((r) => setCouleur(r.couleur)).catch(() => undefined)}
                >
                  Couleur libre
                </button>
              </span>
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-inline">+ Ajouter le type</button>
          </div>
        </form>
      </section>

      <section className="card">
        <h2 className="card-title">Catalogue ({(types.data ?? []).length})</h2>
        <div className="toolbar" style={{ marginBottom: 8 }}>
          <input className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un type..." />
        </div>
        {types.error && <p className="banner banner-error">{types.error}</p>}
        <ul className="list">
          {items.map((t) => (
            <TypeRow
              key={t.id}
              token={token}
              type={t}
              editing={editId === t.id}
              onEdit={() => setEditId(t.id)}
              onClose={() => setEditId(null)}
              onChanged={() => types.reload()}
              onError={setError}
            />
          ))}
        </ul>
        {!types.loading && items.length === 0 && <p className="muted">Aucun type d'événement.</p>}
      </section>
    </div>
  );
}

function TypeRow({
  token,
  type,
  editing,
  onEdit,
  onClose,
  onChanged,
  onError,
}: {
  token: string;
  type: TypeEvenement;
  editing: boolean;
  onEdit: () => void;
  onClose: () => void;
  onChanged: () => void;
  onError: (m: string | null) => void;
}): JSX.Element {
  const [nom, setNom] = useState(type.nom);
  const [description, setDescription] = useState(type.description ?? "");
  const [couleur, setCouleur] = useState(type.couleur);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function run(p: Promise<unknown>, done?: () => void): void {
    setBusy(true);
    onError(null);
    p.then(() => {
      onChanged();
      done?.();
    })
      .catch((e: unknown) => onError(e instanceof ApiError ? e.message : "Erreur réseau"))
      .finally(() => setBusy(false));
  }

  if (editing) {
    return (
      <li className="list-row" style={{ flexWrap: "wrap", gap: 8 }}>
        <div className="form-grid" style={{ width: "100%" }}>
          <label><span>Nom</span><input value={nom} onChange={(e) => setNom(e.target.value)} /></label>
          <label><span>Description</span><input value={description} onChange={(e) => setDescription(e.target.value)} /></label>
          <label>
            <span>Couleur</span>
            <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="color" value={couleur} onChange={(e) => setCouleur(e.target.value.toUpperCase())} style={{ width: 44, height: 34, padding: 0, border: "none", background: "transparent", cursor: "pointer" }} />
              <input value={couleur} onChange={(e) => setCouleur(e.target.value.toUpperCase())} style={{ width: 110, fontFamily: "monospace" }} />
            </span>
          </label>
        </div>
        <div className="org-row-actions" style={{ width: "100%", justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn btn-primary btn-inline"
            disabled={busy || !nom.trim()}
            onClick={() => run(
              updateTypeEvenement(token, type.id, { nom: nom.trim(), description: description.trim(), couleur }),
              onClose,
            )}
          >
            Enregistrer
          </button>
          <button type="button" className="btn btn-ghost btn-inline" onClick={onClose}>Annuler</button>
        </div>
      </li>
    );
  }

  return (
    <li className="list-row org-row">
      <div className="org-row-main" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          aria-label={`Couleur ${type.couleur}`}
          style={{ width: 18, height: 18, borderRadius: 5, background: type.couleur, border: "1px solid rgba(0,0,0,0.15)", flexShrink: 0 }}
        />
        <strong>{type.nom}</strong>
        <span className="muted" style={{ fontFamily: "monospace", fontSize: 11 }}>{type.couleur}</span>
        {type.description && <span className="muted">{type.description}</span>}
      </div>
      <div className="org-row-actions">
        <button
          type="button"
          className={`pill ${type.publie ? "pill-on" : "pill-off"}`}
          disabled={busy}
          title={type.publie ? "Disponible dans la planification" : "Masqué de la planification"}
          onClick={() => run(updateTypeEvenement(token, type.id, { publie: !type.publie }))}
        >
          {type.publie ? "Publié" : "Masqué"}
        </button>
        <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={onEdit}>Modifier</button>
        {confirmDelete ? (
          <>
            <button
              type="button"
              className="btn btn-inline"
              style={{ background: "var(--adsum-danger)", color: "#fff" }}
              disabled={busy}
              onClick={() => run(deleteTypeEvenement(token, type.id), () => setConfirmDelete(false))}
            >
              Confirmer
            </button>
            <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => setConfirmDelete(false)}>Annuler</button>
          </>
        ) : (
          <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => setConfirmDelete(true)}>Supprimer</button>
        )}
      </div>
    </li>
  );
}

function match(value: string, q: string): boolean {
  return !q || value.toLowerCase().includes(q.trim().toLowerCase());
}
