import { useState } from "react";

import {
  ApiError,
  type CibleActivite,
  apercuCibleActivite,
  creerCibleActivite,
  getCiblesActiviteAdmin,
  getFonctions,
  modifierCibleActivite,
  supprimerCibleActivite,
} from "../api.js";
import { useResource } from "../useResource.js";

const STATUT_LABELS: Record<string, string> = {
  actif: "Active",
  inactif: "Désactivée",
  archive: "Archivée",
};

/** Administrable destinations referential (Événements > Paramètres).
 *
 * The activity forms load their destination list from this referential, so an
 * administrator can, WITHOUT any code change: rename a destination (the stable
 * code never changes), reorder the list, deactivate or archive a destination
 * (it disappears from new forms but historical activities keep resolving), and
 * create a new destination from the SAFE template "holders of catalogue
 * functions" (e.g. Patriarches). No free rule can be typed anywhere: the server
 * only accepts whitelisted templates and validates every function key. */
export function DestinationsCiblage({ token, canGerer }: { token: string; canGerer: boolean }): JSX.Element {
  const cibles = useResource(() => getCiblesActiviteAdmin(token), [token]);
  const fonctions = useResource(() => getFonctions(token), [token]);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [creation, setCreation] = useState(false);

  function run(p: Promise<unknown>, message: string): void {
    setBusy(true); setError(null); setNote(null);
    p.then(() => { setNote(message); cibles.reload(); })
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "Erreur réseau"))
      .finally(() => setBusy(false));
  }

  return (
    <section className="card">
      <h2 className="card-title">Destinations et ciblage</h2>
      <p className="muted small">
        Les destinations proposées dans « Destinataires (qui est concerné ?) » des formulaires d'activité viennent de ce
        référentiel. Le <strong>code technique</strong> est stable (jamais renommé, jamais réutilisé) ; le libellé, la
        description et l'ordre sont modifiables librement. Une destination désactivée disparaît des nouveaux formulaires
        mais les activités passées restent intactes. La suppression n'est possible que si aucune activité ne l'utilise.
      </p>
      {error && <p className="banner banner-error">{error}</p>}
      {note && <p className="banner banner-ok">{note}</p>}
      {cibles.error && <p className="banner banner-error">{cibles.error}</p>}
      <ul className="list">
        {(cibles.data ?? []).map((c) => (
          <li key={c.code} className="list-row" style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "stretch" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ flex: 1 }}>
                <strong>{c.libelle}</strong>{" "}
                <span className="muted small mono">{c.code}</span>{" "}
                <span className={`badge ${c.statut === "actif" ? "badge-ok" : "badge-warn"}`}>{STATUT_LABELS[c.statut] ?? c.statut}</span>
              </span>
              <ApercuInline token={token} cible={c} />
              {canGerer && (
                <button type="button" className="btn btn-ghost btn-inline" onClick={() => setOuvert(ouvert === c.code ? null : c.code)}>
                  {ouvert === c.code ? "Fermer" : "Modifier"}
                </button>
              )}
            </div>
            {c.description && <span className="muted small">{c.description}</span>}
            {ouvert === c.code && canGerer && (
              <EditionDestination cible={c} busy={busy}
                onSave={(payload) => run(modifierCibleActivite(token, c.code, payload), `Destination « ${c.libelle} » mise à jour.`)}
                onDelete={() => run(supprimerCibleActivite(token, c.code), `Destination « ${c.libelle} » supprimée (elle n'était utilisée par aucune activité).`)}
              />
            )}
          </li>
        ))}
      </ul>
      {canGerer && (
        <div style={{ marginTop: 10 }}>
          {!creation ? (
            <button type="button" className="btn btn-primary btn-inline" onClick={() => setCreation(true)}>
              Nouvelle destination (porteurs de fonction)
            </button>
          ) : (
            <CreationDestination
              busy={busy}
              fonctions={(fonctions.data ?? []).filter((f) => f.actif)}
              onCancel={() => setCreation(false)}
              onCreate={(payload) => { run(creerCibleActivite(token, payload), `Destination « ${payload.libelle} » créée : elle est immédiatement proposée dans les formulaires.`); setCreation(false); }}
            />
          )}
        </div>
      )}
    </section>
  );
}

/** Server-computed audience size of one destination (skipped for unit and list
 * kinds: a unit destination depends on WHICH unit, a list on the typed e-mails). */
function ApercuInline({ token, cible }: { token: string; cible: CibleActivite }): JSX.Element | null {
  const skip = cible.besoin_unite || cible.type_regle === "liste" || cible.statut !== "actif";
  const apercu = useResource(
    () => (skip ? Promise.resolve(null) : apercuCibleActivite(token, cible.code)),
    [token, cible.code, String(skip)],
  );
  if (skip || apercu.data == null) return null;
  return <span className="badge badge-mut">{apercu.data.nombre} membre{apercu.data.nombre > 1 ? "s" : ""}</span>;
}

function EditionDestination({ cible, busy, onSave, onDelete }: {
  cible: CibleActivite;
  busy: boolean;
  onSave: (payload: { libelle?: string; description?: string | null; ordre?: number; statut?: string }) => void;
  onDelete: () => void;
}): JSX.Element {
  const [libelle, setLibelle] = useState(cible.libelle);
  const [description, setDescription] = useState(cible.description ?? "");
  const [ordre, setOrdre] = useState(String(cible.ordre));
  const [statut, setStatut] = useState<string>(cible.statut);
  return (
    <div style={{ background: "var(--adsum-panel)", border: "1px solid var(--adsum-line)", borderRadius: 10, padding: "10px 12px", display: "grid", gap: 8 }}>
      <label>
        <span>Libellé affiché</span>
        <input value={libelle} onChange={(e) => setLibelle(e.target.value)} maxLength={120} />
      </label>
      <label>
        <span>Description (aide affichée aux opérateurs)</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={2000} />
      </label>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <label>
          <span>Ordre d'affichage</span>
          <input type="number" min={0} max={10000} value={ordre} onChange={(e) => setOrdre(e.target.value)} style={{ width: 110 }} />
        </label>
        <label>
          <span>Statut</span>
          <select value={statut} onChange={(e) => setStatut(e.target.value)}>
            <option value="actif">Active (proposée dans les formulaires)</option>
            <option value="inactif">Désactivée (masquée des nouveaux formulaires)</option>
            <option value="archive">Archivée (conservée pour l'historique)</option>
          </select>
        </label>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-primary btn-inline" disabled={busy || !libelle.trim()}
          onClick={() => onSave({ libelle: libelle.trim(), description: description.trim() || null, ordre: Number(ordre) || 0, statut })}>
          Enregistrer
        </button>
        <button type="button" className="btn btn-danger btn-inline" disabled={busy} onClick={onDelete}
          title="Refusée (409) si au moins une activité utilise cette destination : archivez-la plutôt.">
          Supprimer (si inutilisée)
        </button>
      </div>
      <span className="muted small">Le code technique « {cible.code} » ne change jamais : l'historique et les statistiques restent cohérents même après un renommage.</span>
    </div>
  );
}

function CreationDestination({ busy, fonctions, onCancel, onCreate }: {
  busy: boolean;
  fonctions: { cle: string; libelle_n: string }[];
  onCancel: () => void;
  onCreate: (payload: { code: string; libelle: string; description?: string | null; fonction_cles: string[] }) => void;
}): JSX.Element {
  const [libelle, setLibelle] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [cles, setCles] = useState<string[]>([]);
  const codeAuto = libelle
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  const codeFinal = (code || codeAuto).trim();
  return (
    <div style={{ background: "var(--adsum-panel)", border: "1px solid var(--adsum-line)", borderRadius: 10, padding: "10px 12px", display: "grid", gap: 8 }}>
      <p className="muted small" style={{ margin: 0 }}>
        Gabarit sûr « porteurs de fonction » : la destination touchera les membres actifs détenant au moins une des
        fonctions choisies (fonction active et confirmée), sans doublon. Aucune règle libre n'est possible.
      </p>
      <label>
        <span>Libellé affiché *</span>
        <input value={libelle} onChange={(e) => setLibelle(e.target.value)} maxLength={120} placeholder="ex. Les patriarches et bergers" />
      </label>
      <label>
        <span>Code technique (stable, non modifiable ensuite)</span>
        <input className="mono" value={code} onChange={(e) => setCode(e.target.value)} maxLength={40} placeholder={codeAuto || "généré depuis le libellé"} />
      </label>
      <label>
        <span>Description (facultative)</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={2000} />
      </label>
      <fieldset style={{ border: "1px solid var(--adsum-line)", borderRadius: 8, padding: "8px 10px" }}>
        <legend className="muted small">Fonctions du catalogue concernées *</legend>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {fonctions.map((f) => (
            <label key={f.cle} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={cles.includes(f.cle)}
                onChange={(e) => setCles(e.target.checked ? [...cles, f.cle] : cles.filter((x) => x !== f.cle))}
              />
              {f.libelle_n}
            </label>
          ))}
          {fonctions.length === 0 && <span className="muted small">Aucune fonction active dans le catalogue.</span>}
        </div>
      </fieldset>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="btn btn-primary btn-inline" disabled={busy || !libelle.trim() || !codeFinal || cles.length === 0}
          onClick={() => onCreate({ code: codeFinal, libelle: libelle.trim(), description: description.trim() || null, fonction_cles: cles })}>
          Créer la destination
        </button>
        <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={onCancel}>Annuler</button>
      </div>
    </div>
  );
}
