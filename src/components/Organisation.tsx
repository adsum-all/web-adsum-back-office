import { useMemo, useState } from "react";

import {
  ApiError,
  type Coordination,
  type CoordinationInput,
  type Intendance,
  type IntendanceInput,
  createCoordination,
  createIntendance,
  getCoordinations,
  getIntendances,
  updateCoordination,
  updateIntendance,
} from "../api.js";
import { CONTINENTS, PAYS, nomPays } from "../countries.js";
import { useResource } from "../useResource.js";
import { OrgItemRow } from "./OrgItemRow.js";

/**
 * Coordinations and intendances: two independent structures of the same level.
 * Neither requires the other. Each carries a real descriptive and geographic
 * identity (description, country, continent, city, status), not just a name. A
 * parent link (coordination over coordination, intendance over intendance, or an
 * intendance attached to a coordination) is offered only behind an explicit
 * toggle, never imposed by default.
 */
export function Organisation({ token }: { token: string }): JSX.Element {
  const coordinations = useResource(() => getCoordinations(token), [token]);
  const intendances = useResource(() => getIntendances(token), [token]);
  const [error, setError] = useState<string | null>(null);
  const [editCoord, setEditCoord] = useState<string | null>(null);
  const [editIntend, setEditIntend] = useState<string | null>(null);
  const [qCoord, setQCoord] = useState("");
  const [qIntend, setQIntend] = useState("");
  const [filtrePays, setFiltrePays] = useState("");

  function guard<T>(p: Promise<T>, reload: () => void, done?: () => void): void {
    setError(null);
    p.then(() => {
      reload();
      done?.();
    }).catch((e: unknown) => setError(e instanceof ApiError ? e.message : "Erreur réseau"));
  }

  const coords = coordinations.data ?? [];
  const coordsVisibles = useMemo(
    () => coords.filter((c) => match(c.nom, qCoord)),
    [coords, qCoord],
  );
  const intends = intendances.data ?? [];
  const intendsVisibles = useMemo(
    () => intends.filter((i) => match(i.nom, qIntend) && (!filtrePays || i.pays_code === filtrePays)),
    [intends, qIntend, filtrePays],
  );

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Coordinations & intendances</h1>
          <p className="muted">
            Deux structures indépendantes de même niveau. Aucune ne dépend de l'autre : un rattachement reste facultatif et
            explicite.
          </p>
        </div>
      </header>
      {error && <p className="banner banner-error">{error}</p>}

      <section className="card">
        <h2 className="card-title">Coordinations</h2>
        <CoordinationForm
          coordinations={coords}
          submitLabel="+ Ajouter"
          onSubmit={(input) => guard(createCoordination(token, { ...input, nom: input.nom ?? "" }), coordinations.reload)}
        />
        <div className="toolbar" style={{ marginTop: 8 }}>
          <input className="search" placeholder="Rechercher une coordination" value={qCoord} onChange={(e) => setQCoord(e.target.value)} />
        </div>
        <ul className="list">
          {coordsVisibles.map((c) =>
            editCoord === c.id ? (
              <li key={c.id} className="list-item">
                <CoordinationForm
                  coordinations={coords.filter((x) => x.id !== c.id)}
                  initial={c}
                  submitLabel="Enregistrer"
                  onCancel={() => setEditCoord(null)}
                  onSubmit={(input) => guard(updateCoordination(token, c.id, input), coordinations.reload, () => setEditCoord(null))}
                />
              </li>
            ) : (
              <OrgItemRow
                key={c.id}
                token={token}
                entity="coordinations"
                id={c.id}
                nom={c.nom}
                meta={coordMeta(c)}
                publie={c.publie}
                onEdit={() => setEditCoord(c.id)}
                onChanged={coordinations.reload}
              />
            ),
          )}
        </ul>
      </section>

      <section className="card">
        <h2 className="card-title">Intendances</h2>
        <IntendanceForm
          coordinations={coords}
          intendances={intends}
          submitLabel="+ Ajouter"
          onSubmit={(input) => guard(createIntendance(token, { ...input, nom: input.nom ?? "" }), intendances.reload)}
        />
        <div className="toolbar" style={{ marginTop: 8 }}>
          <input className="search" placeholder="Rechercher une intendance" value={qIntend} onChange={(e) => setQIntend(e.target.value)} />
          <select className="search" value={filtrePays} onChange={(e) => setFiltrePays(e.target.value)}>
            <option value="">Tous les pays</option>
            {PAYS.map((p) => (
              <option key={p.code} value={p.code}>{p.nom}</option>
            ))}
          </select>
        </div>
        <ul className="list">
          {intendsVisibles.map((i) =>
            editIntend === i.id ? (
              <li key={i.id} className="list-item">
                <IntendanceForm
                  coordinations={coords}
                  intendances={intends.filter((x) => x.id !== i.id)}
                  initial={i}
                  submitLabel="Enregistrer"
                  onCancel={() => setEditIntend(null)}
                  onSubmit={(input) => guard(updateIntendance(token, i.id, input), intendances.reload, () => setEditIntend(null))}
                />
              </li>
            ) : (
              <OrgItemRow
                key={i.id}
                token={token}
                entity="intendances"
                id={i.id}
                nom={i.nom}
                meta={intendMeta(i)}
                publie={i.publie}
                onEdit={() => setEditIntend(i.id)}
                onChanged={intendances.reload}
              />
            ),
          )}
        </ul>
      </section>
    </div>
  );
}

function match(nom: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  return !q || nom.toLowerCase().includes(q);
}

function coordMeta(c: Coordination): string | undefined {
  return (
    [
      c.description ?? "",
      [c.ville, nomPays(c.pays_code) ?? c.pays, c.continent].filter(Boolean).join(", "),
      c.responsable ? `${c.responsable_titre ?? "Coordinateur"} : ${c.responsable}` : "",
      c.parent ? `dans ${c.parent}` : "",
      c.statut === "archive" ? "archivé" : "",
    ]
      .filter(Boolean)
      .join(" · ") || undefined
  );
}

function intendMeta(i: Intendance): string | undefined {
  return (
    [
      i.description ?? "",
      [i.ville, nomPays(i.pays_code) ?? i.pays, i.continent].filter(Boolean).join(", "),
      i.responsable ? `${i.responsable_titre ?? "Intendant"} : ${i.responsable}` : "",
      i.coordination ? `Coordination ${i.coordination}` : "",
      i.parent ? `dans ${i.parent}` : "",
      i.statut === "archive" ? "archivé" : "",
    ]
      .filter(Boolean)
      .join(" · ") || undefined
  );
}

function PaysSelect({ value, onChange }: { value: string; onChange: (v: string) => void }): JSX.Element {
  return (
    <select className="search" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Pays">
      <option value="">Pays (facultatif)</option>
      {PAYS.map((p) => (
        <option key={p.code} value={p.code}>{p.nom}</option>
      ))}
    </select>
  );
}

function ContinentSelect({ value, onChange }: { value: string; onChange: (v: string) => void }): JSX.Element {
  return (
    <select className="search" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Continent">
      <option value="">Continent (facultatif)</option>
      {CONTINENTS.map((c) => (
        <option key={c} value={c}>{c}</option>
      ))}
    </select>
  );
}

function CoordinationForm({
  coordinations,
  onSubmit,
  initial,
  submitLabel,
  onCancel,
}: {
  coordinations: Coordination[];
  onSubmit: (input: CoordinationInput) => void;
  initial?: Coordination;
  submitLabel: string;
  onCancel?: () => void;
}): JSX.Element {
  const [nom, setNom] = useState(initial?.nom ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [paysCode, setPaysCode] = useState(initial?.pays_code ?? "");
  const [continent, setContinent] = useState(initial?.continent ?? "");
  const [ville, setVille] = useState(initial?.ville ?? "");
  const [statut, setStatut] = useState(initial?.statut ?? "actif");
  const [lie, setLie] = useState(Boolean(initial?.parent_id));
  const [parentId, setParentId] = useState(initial?.parent_id ?? "");

  return (
    <form
      className="toolbar"
      style={{ flexWrap: "wrap", alignItems: "center", gap: 8 }}
      onSubmit={(e) => {
        e.preventDefault();
        if (!nom.trim()) return;
        onSubmit({
          nom: nom.trim(),
          description: description.trim() || undefined,
          pays_code: paysCode || undefined,
          continent: continent || undefined,
          ville: ville.trim() || undefined,
          statut,
          parent_id: lie ? parentId || undefined : undefined,
        });
        if (!initial) {
          setNom("");
          setDescription("");
          setPaysCode("");
          setContinent("");
          setVille("");
          setStatut("actif");
          setLie(false);
          setParentId("");
        }
      }}
    >
      <input className="search" placeholder="Nom de la coordination" value={nom} onChange={(e) => setNom(e.target.value)} />
      <input className="search" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
      <PaysSelect value={paysCode} onChange={setPaysCode} />
      <ContinentSelect value={continent} onChange={setContinent} />
      <input className="search" placeholder="Ville (facultatif)" value={ville} onChange={(e) => setVille(e.target.value)} />
      <select className="search" value={statut} onChange={(e) => setStatut(e.target.value)} aria-label="Statut">
        <option value="actif">Actif</option>
        <option value="archive">Archivé</option>
      </select>
      <label className="check" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input type="checkbox" checked={lie} onChange={(e) => setLie(e.target.checked)} />
        Rattacher à une coordination parente
      </label>
      {lie && (
        <select className="search" value={parentId} onChange={(e) => setParentId(e.target.value)}>
          <option value="">Coordination parente</option>
          {coordinations.map((c) => (
            <option key={c.id} value={c.id}>{c.nom}</option>
          ))}
        </select>
      )}
      <button type="submit" className="btn btn-primary btn-inline">{submitLabel}</button>
      {onCancel && (
        <button type="button" className="btn btn-inline" onClick={onCancel}>Annuler</button>
      )}
    </form>
  );
}

function IntendanceForm({
  coordinations,
  intendances,
  onSubmit,
  initial,
  submitLabel,
  onCancel,
}: {
  coordinations: Coordination[];
  intendances: Intendance[];
  onSubmit: (input: IntendanceInput) => void;
  initial?: Intendance;
  submitLabel: string;
  onCancel?: () => void;
}): JSX.Element {
  const [nom, setNom] = useState(initial?.nom ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [paysCode, setPaysCode] = useState(initial?.pays_code ?? "");
  const [continent, setContinent] = useState(initial?.continent ?? "");
  const [ville, setVille] = useState(initial?.ville ?? "");
  const [statut, setStatut] = useState(initial?.statut ?? "actif");
  const [lie, setLie] = useState(Boolean(initial?.coordination_id || initial?.parent_id));
  const [coordinationId, setCoordinationId] = useState(initial?.coordination_id ?? "");
  const [parentId, setParentId] = useState(initial?.parent_id ?? "");

  return (
    <form
      className="toolbar"
      style={{ flexWrap: "wrap", alignItems: "center", gap: 8 }}
      onSubmit={(e) => {
        e.preventDefault();
        if (!nom.trim()) return;
        onSubmit({
          nom: nom.trim(),
          description: description.trim() || undefined,
          pays_code: paysCode || undefined,
          pays: nomPays(paysCode) ?? undefined,
          continent: continent || undefined,
          ville: ville.trim() || undefined,
          statut,
          coordination_id: lie ? coordinationId || undefined : undefined,
          parent_id: lie ? parentId || undefined : undefined,
        });
        if (!initial) {
          setNom("");
          setDescription("");
          setPaysCode("");
          setContinent("");
          setVille("");
          setStatut("actif");
          setLie(false);
          setCoordinationId("");
          setParentId("");
        }
      }}
    >
      <input className="search" placeholder="Nom de l'intendance" value={nom} onChange={(e) => setNom(e.target.value)} />
      <input className="search" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
      <PaysSelect value={paysCode} onChange={setPaysCode} />
      <ContinentSelect value={continent} onChange={setContinent} />
      <input className="search" placeholder="Ville (facultatif)" value={ville} onChange={(e) => setVille(e.target.value)} />
      <select className="search" value={statut} onChange={(e) => setStatut(e.target.value)} aria-label="Statut">
        <option value="actif">Actif</option>
        <option value="archive">Archivé</option>
      </select>
      <label className="check" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input type="checkbox" checked={lie} onChange={(e) => setLie(e.target.checked)} />
        Rattacher à une structure (facultatif)
      </label>
      {lie && (
        <>
          <select className="search" value={coordinationId} onChange={(e) => setCoordinationId(e.target.value)}>
            <option value="">Coordination (facultatif)</option>
            {coordinations.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
          <select className="search" value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">Intendance parente (facultatif)</option>
            {intendances.map((i) => (
              <option key={i.id} value={i.id}>{i.nom}</option>
            ))}
          </select>
        </>
      )}
      <button type="submit" className="btn btn-primary btn-inline">{submitLabel}</button>
      {onCancel && (
        <button type="button" className="btn btn-inline" onClick={onCancel}>Annuler</button>
      )}
    </form>
  );
}
