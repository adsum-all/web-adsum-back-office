import { useState } from "react";

import {
  ApiError,
  CATEGORIES_ATTRIBUTION,
  type FonctionCreateInput,
  createFonction,
  getFonctions,
} from "../api.js";
import { useResource } from "../useResource.js";
import { categorieLabel, categorieUtiliseAbreviation } from "./CategorieBadge.js";
import { FonctionRow } from "./FonctionRow.js";
import { InfoTip } from "./InfoTip.js";
import { Tabs } from "./Tabs.js";

// Contextual help shown under the tab bar so a manager knows what belongs in the
// category before creating an attribution.
const CAT_HINT: Record<string, string> = {
  titre: "Titres de consécration (Berger, Bergère). Le port du titre s'attribue sur la fiche du membre.",
  fonction_speciale: "Fonctions spéciales de gouvernance : Fondateur, Modérateur, Berger des missions.",
  fonction:
    "Fonctions de responsabilité : Intendant, Coordinateur, Responsable, Sous-responsable, Intendant général, Contrôleur général.",
  fonction_particuliere: "Fonctions particulières et rôles transversaux, dont le Patriarche.",
};

const CAT_VIDE: Record<string, string> = {
  titre: "Aucun titre dans cette catégorie.",
  fonction_speciale: "Aucune fonction spéciale.",
  fonction: "Aucune fonction.",
  fonction_particuliere: "Aucune fonction particulière.",
};

const DEFAULT_CAT = CATEGORIES_ATTRIBUTION[0]?.code ?? "titre";

function emptyForm(categorie: string): FonctionCreateInput {
  return { cle: "", libelle_h: "", libelle_f: "", libelle_n: "", categorie, abreviation: "", est_vip: false, ordre: 0 };
}

// Normalise the free-typed key to the backend pattern (^[a-z0-9_]+$): lowercase,
// strip accents and turn every other run into a single underscore.
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

/**
 * CRUD editor for the attribution catalogue. The catalogue carries four distinct
 * categories (titre, fonction spéciale, fonction, fonction particulière); a tab
 * bar filters the table and targets the creation form on the active category, so
 * a title is never created from the Fonctions tab and the reverse.
 */
export function Fonctions({ token, canGerer = true }: { token: string; canGerer?: boolean }): JSX.Element {
  const fonctions = useResource(() => getFonctions(token), [token]);
  const [activeCat, setActiveCat] = useState<string>(DEFAULT_CAT);
  const [form, setForm] = useState<FonctionCreateInput>(() => emptyForm(DEFAULT_CAT));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof FonctionCreateInput>(key: K, value: FonctionCreateInput[K]): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Switching the tab also retargets the creation form on the tab's category and
  // clears an abbreviation that no longer applies.
  function changeTab(code: string): void {
    setActiveCat(code);
    setError(null);
    setForm((f) => ({
      ...f,
      categorie: code,
      abreviation: categorieUtiliseAbreviation(code) ? f.abreviation : "",
    }));
  }

  // The category selector inside the form stays the single source of truth: pick a
  // category, the abbreviation field appears only where it is meaningful.
  function changeFormCategorie(code: string): void {
    setForm((f) => ({
      ...f,
      categorie: code,
      abreviation: categorieUtiliseAbreviation(code) ? f.abreviation : "",
    }));
  }

  const cle = slugCle(form.cle);
  const formUseAbreviation = categorieUtiliseAbreviation(form.categorie);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!cle || !form.libelle_h.trim() || !form.libelle_f.trim()) {
      setError("La clé et les libellés (homme, femme) sont obligatoires.");
      return;
    }
    if (!form.categorie) {
      setError("La catégorie est obligatoire.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createFonction(token, {
        cle,
        libelle_h: form.libelle_h.trim(),
        libelle_f: form.libelle_f.trim(),
        libelle_n: form.libelle_n.trim() || form.libelle_h.trim(),
        categorie: form.categorie,
        abreviation: formUseAbreviation ? (form.abreviation ?? "").trim() || null : null,
        est_vip: form.est_vip,
        ordre: form.ordre,
      });
      setForm(emptyForm(activeCat));
      fonctions.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  const all = fonctions.data ?? [];
  const visibles = all.filter((f) => f.categorie === activeCat);
  const activeLabel = categorieLabel(activeCat);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Titres et fonctions</h1>
          <p className="muted">
            Catalogue des attributions proposées aux membres, réparti en quatre catégories : les titres de consécration
            (Berger, Bergère), les fonctions spéciales (Fondateur, Modérateur), les fonctions de responsabilité
            (Intendant, Coordinateur, Responsable) et les fonctions particulières (Patriarche et rôles transversaux). Le
            libellé est choisi selon le genre.
          </p>
        </div>
      </header>

      {!canGerer && (
        <p className="banner banner-info small">
          Vous consultez ce catalogue en lecture seule. La modification requiert la permission
          <span className="mono"> fonctions.gerer</span>.
        </p>
      )}

      <Tabs tabs={CATEGORIES_ATTRIBUTION.map((c) => ({ id: c.code, label: c.label }))} active={activeCat} onChange={changeTab} />

      <p className="muted small">{CAT_HINT[activeCat]}</p>

      <p className="muted small">
        L'option VIP détermine si les membres portant cette attribution apparaissent par défaut dans les calendriers
        d'anniversaire des autres membres.
      </p>

      {canGerer && (
        <form className="form-card" onSubmit={submit}>
          <div className="form-grid">
            <label>
              <span>Catégorie *</span>
              <select value={form.categorie} onChange={(e) => changeFormCategorie(e.target.value)} required>
                {CATEGORIES_ATTRIBUTION.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Clé *</span>
              <input value={form.cle} onChange={(e) => set("cle", e.target.value)} placeholder="responsable_commission" required />
            </label>
            <label>
              <span>Libellé (homme) *</span>
              <input value={form.libelle_h} onChange={(e) => set("libelle_h", e.target.value)} placeholder="Responsable" required />
            </label>
            <label>
              <span>Libellé (femme) *</span>
              <input value={form.libelle_f} onChange={(e) => set("libelle_f", e.target.value)} placeholder="Responsable" required />
            </label>
            <label>
              <span>Libellé neutre</span>
              <input value={form.libelle_n} onChange={(e) => set("libelle_n", e.target.value)} placeholder="Responsable" />
            </label>
            {formUseAbreviation && (
              <label>
                <span>Abréviation</span>
                <input
                  value={form.abreviation ?? ""}
                  onChange={(e) => set("abreviation", e.target.value)}
                  placeholder="Resp."
                  maxLength={12}
                />
                <span className="muted small">Utilisée dans les affichages compacts, ex Resp., Coord.</span>
              </label>
            )}
            <label>
              <span>Ordre</span>
              <input type="number" value={form.ordre} onChange={(e) => set("ordre", Number(e.target.value))} />
            </label>
            <label className="check" style={{ alignSelf: "end" }}>
              <input type="checkbox" checked={form.est_vip} onChange={(e) => set("est_vip", e.target.checked)} />
              VIP (calendriers d'anniversaire)
            </label>
          </div>
          {form.cle.trim() && form.cle.trim() !== cle && (
            <p className="muted small">Clé technique : <span className="mono">{cle || "(invalide)"}</span></p>
          )}
          {error && <p className="banner banner-error">{error}</p>}
          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-inline" disabled={busy}>
              {busy ? "Création..." : `+ Nouvelle attribution (${activeLabel})`}
            </button>
          </div>
        </form>
      )}

      {fonctions.error && <p className="banner banner-error">{fonctions.error}</p>}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Clé</th>
              <th>Catégorie</th>
              <th>Libellé (H)</th>
              <th>Libellé (F)</th>
              <th>Neutre</th>
              <th>
                Abréviation
                <InfoTip text="Forme courte utilisée dans les affichages compacts (ex Resp., Coord.). Concerne les fonctions et fonctions particulières." />
              </th>
              <th>
                VIP
                <InfoTip text="Si actif, les membres portant cette attribution apparaissent par défaut dans les calendriers d'anniversaire." />
              </th>
              <th>Ordre</th>
              <th>Actif</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {fonctions.loading && (
              <tr>
                <td colSpan={10} className="muted">
                  Chargement...
                </td>
              </tr>
            )}
            {!fonctions.loading && visibles.length === 0 && (
              <tr>
                <td colSpan={10} className="muted">
                  {CAT_VIDE[activeCat] ?? "Aucune attribution dans cette catégorie."}
                </td>
              </tr>
            )}
            {visibles.map((f) => (
              <FonctionRow key={f.cle} token={token} fonction={f} canGerer={canGerer} onChanged={fonctions.reload} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
