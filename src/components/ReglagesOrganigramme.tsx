import { useEffect, useState } from "react";

import { getOrganigrammeReglages, updateOrganigrammeReglages, type OrganigrammeReglages } from "../api.js";

/**
 * Back-office settings that control HOW the org chart appears in the member app:
 * which tabs of "Ma hierarchie" are visible (by default only the chain and the org
 * chart), and whether the published chart is shown as the interactive canvas or a
 * simpler image-like view the member just zooms and pans. Reserved to administrators.
 */
const ONGLETS: { id: keyof OrganigrammeReglages["onglets"]; label: string; verrou?: boolean }[] = [
  { id: "chaine", label: "Ma chaîne", verrou: true },
  { id: "rattachements", label: "Mes rattachements" },
  { id: "titres", label: "Titres et liens (équipes spéciales)" },
  { id: "organigramme", label: "Organigramme publié" },
];

export function ReglagesOrganigramme({ token }: Readonly<{ token: string }>): JSX.Element {
  const [reglages, setReglages] = useState<OrganigrammeReglages | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let alive = true;
    getOrganigrammeReglages(token)
      .then((r) => alive && setReglages(r))
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Erreur"));
    return () => { alive = false; };
  }, [token]);

  async function enregistrer(next: OrganigrammeReglages): Promise<void> {
    setReglages(next);
    setSaving(true);
    setError(null);
    setOk(false);
    try {
      const saved = await updateOrganigrammeReglages(token, next);
      setReglages(saved);
      setOk(true);
      window.setTimeout(() => setOk(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  if (!reglages) {
    return <div className="card"><p className="muted small">{error ?? "Chargement des réglages…"}</p></div>;
  }

  return (
    <section className="card" style={{ marginBottom: 14 }}>
      <p className="card-title">Affichage côté application des membres</p>
      <p className="muted small" style={{ marginTop: 2 }}>
        Choisissez les onglets visibles dans « Ma hiérarchie » et le mode d'affichage de l'organigramme. Par défaut, seuls « Ma chaîne » et « Organigramme » sont visibles.
      </p>

      <p className="muted small" style={{ marginTop: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Onglets visibles</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 6 }}>
        {ONGLETS.map((o) => (
          <label key={o.id} className="check small" title={o.verrou ? "Toujours visible" : undefined}>
            <input
              type="checkbox"
              checked={o.verrou ? true : reglages.onglets[o.id]}
              disabled={o.verrou || saving}
              onChange={(e) => enregistrer({ ...reglages, onglets: { ...reglages.onglets, [o.id]: e.target.checked } })}
            />
            {o.label}
          </label>
        ))}
      </div>

      <p className="muted small" style={{ marginTop: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Mode d'affichage de l'organigramme</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 6 }}>
        <label className="check small">
          <input type="radio" name="org-affichage" checked={reglages.affichage === "interactif"} disabled={saving}
            onChange={() => enregistrer({ ...reglages, affichage: "interactif" })} />
          Interactif (recherche, plier/déplier, légende)
        </label>
        <label className="check small">
          <input type="radio" name="org-affichage" checked={reglages.affichage === "image"} disabled={saving}
            onChange={() => enregistrer({ ...reglages, affichage: "image" })} />
          Image simple (le membre zoome et déplace seulement)
        </label>
      </div>

      <div style={{ marginTop: 10, minHeight: 18 }}>
        {error ? <span className="badge badge-bad">{error}</span> : ok ? <span className="badge badge-ok">Enregistré</span> : saving ? <span className="muted small">Enregistrement…</span> : null}
      </div>
    </section>
  );
}
