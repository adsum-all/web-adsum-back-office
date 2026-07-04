import { useState } from "react";

import {
  ApiError,
  type Coordination,
  type Intendance,
  createCoordination,
  createIntendance,
  getCoordinations,
  getIntendances,
} from "../api.js";
import { useResource } from "../useResource.js";
import { OrgItemRow } from "./OrgItemRow.js";

/**
 * Coordinations and intendances: two independent structures of the same level.
 * Neither requires the other. A parent link (coordination over coordination,
 * intendance over intendance, or an intendance attached to a coordination) is
 * offered only behind an explicit toggle, never imposed by default.
 */
export function Organisation({ token }: { token: string }): JSX.Element {
  const coordinations = useResource(() => getCoordinations(token), [token]);
  const intendances = useResource(() => getIntendances(token), [token]);
  const [error, setError] = useState<string | null>(null);

  function guard<T>(p: Promise<T>, reload: () => void): void {
    setError(null);
    p.then(reload).catch((e: unknown) => setError(e instanceof ApiError ? e.message : "Erreur réseau"));
  }

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
          coordinations={coordinations.data ?? []}
          onSubmit={(input) => guard(createCoordination(token, input), coordinations.reload)}
        />
        <ul className="list">
          {(coordinations.data ?? []).map((c) => (
            <OrgItemRow
              key={c.id}
              token={token}
              entity="coordinations"
              id={c.id}
              nom={c.nom}
              meta={[c.description ?? "", c.parent ? `dans ${c.parent}` : ""].filter(Boolean).join(" · ") || undefined}
              publie={c.publie}
              onChanged={coordinations.reload}
            />
          ))}
        </ul>
      </section>

      <section className="card">
        <h2 className="card-title">Intendances</h2>
        <IntendanceForm
          coordinations={coordinations.data ?? []}
          intendances={intendances.data ?? []}
          onSubmit={(input) => guard(createIntendance(token, input), intendances.reload)}
        />
        <ul className="list">
          {(intendances.data ?? []).map((i) => (
            <OrgItemRow
              key={i.id}
              token={token}
              entity="intendances"
              id={i.id}
              nom={i.nom}
              meta={
                [
                  [i.ville, i.pays].filter(Boolean).join(", "),
                  i.coordination ? `Coordination ${i.coordination}` : "",
                  i.parent ? `dans ${i.parent}` : "",
                ]
                  .filter(Boolean)
                  .join(" · ") || undefined
              }
              publie={i.publie}
              onChanged={intendances.reload}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}

function CoordinationForm({
  coordinations,
  onSubmit,
}: {
  coordinations: Coordination[];
  onSubmit: (input: { nom: string; parent_id?: string }) => void;
}): JSX.Element {
  const [nom, setNom] = useState("");
  const [lie, setLie] = useState(false);
  const [parentId, setParentId] = useState("");

  return (
    <form
      className="toolbar"
      style={{ flexWrap: "wrap", alignItems: "center" }}
      onSubmit={(e) => {
        e.preventDefault();
        if (!nom.trim()) return;
        onSubmit({ nom: nom.trim(), parent_id: lie ? parentId || undefined : undefined });
        setNom("");
        setLie(false);
        setParentId("");
      }}
    >
      <input className="search" placeholder="Nom de la coordination" value={nom} onChange={(e) => setNom(e.target.value)} />
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
      <button type="submit" className="btn btn-primary btn-inline">+ Ajouter</button>
    </form>
  );
}

function IntendanceForm({
  coordinations,
  intendances,
  onSubmit,
}: {
  coordinations: Coordination[];
  intendances: Intendance[];
  onSubmit: (input: { nom: string; pays?: string; ville?: string; coordination_id?: string; parent_id?: string }) => void;
}): JSX.Element {
  const [nom, setNom] = useState("");
  const [pays, setPays] = useState("");
  const [ville, setVille] = useState("");
  const [lie, setLie] = useState(false);
  const [coordinationId, setCoordinationId] = useState("");
  const [parentId, setParentId] = useState("");

  return (
    <form
      className="toolbar"
      style={{ flexWrap: "wrap", alignItems: "center" }}
      onSubmit={(e) => {
        e.preventDefault();
        if (!nom.trim()) return;
        onSubmit({
          nom: nom.trim(),
          pays: pays.trim() || undefined,
          ville: ville.trim() || undefined,
          coordination_id: lie ? coordinationId || undefined : undefined,
          parent_id: lie ? parentId || undefined : undefined,
        });
        setNom("");
        setPays("");
        setVille("");
        setLie(false);
        setCoordinationId("");
        setParentId("");
      }}
    >
      <input className="search" placeholder="Nom de l'intendance" value={nom} onChange={(e) => setNom(e.target.value)} />
      <input className="search" placeholder="Pays" value={pays} onChange={(e) => setPays(e.target.value)} />
      <input className="search" placeholder="Ville" value={ville} onChange={(e) => setVille(e.target.value)} />
      <label className="check" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input type="checkbox" checked={lie} onChange={(e) => setLie(e.target.checked)} />
        Rattacher à une structure parente (facultatif)
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
      <button type="submit" className="btn btn-primary btn-inline">+ Ajouter</button>
    </form>
  );
}
