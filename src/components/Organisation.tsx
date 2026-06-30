import { useState } from "react";

import {
  ApiError,
  createCoordination,
  createIntendance,
  createSousCommission,
  getCommissions,
  getCoordinations,
  getIntendances,
  getSousCommissions,
} from "../api.js";
import { useResource } from "../useResource.js";
import { OrgItemRow } from "./OrgItemRow.js";

export function Organisation({ token }: { token: string }): JSX.Element {
  const coordinations = useResource(() => getCoordinations(token), [token]);
  const intendances = useResource(() => getIntendances(token), [token]);
  const sousCommissions = useResource(() => getSousCommissions(token), [token]);
  const commissions = useResource(() => getCommissions(token), [token]);
  const [error, setError] = useState<string | null>(null);

  function guard<T>(p: Promise<T>, reload: () => void): void {
    p.then(reload).catch((e: unknown) => setError(e instanceof ApiError ? e.message : "Erreur reseau"));
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Organisation</h1>
          <p className="muted">Coordinations, intendances et sous-commissions de la communaute.</p>
        </div>
      </header>
      {error && <p className="banner banner-error">{error}</p>}

      <section className="card">
        <h2 className="card-title">Coordinations</h2>
        <CreateRow
          fields={[{ key: "nom", placeholder: "Nom de la coordination" }]}
          onSubmit={(v) => guard(createCoordination(token, { nom: v.nom ?? "" }), coordinations.reload)}
        />
        <ul className="list">
          {(coordinations.data ?? []).map((c) => (
            <OrgItemRow
              key={c.id}
              token={token}
              entity="coordinations"
              id={c.id}
              nom={c.nom}
              meta={c.description ?? undefined}
              publie={c.publie}
              onChanged={coordinations.reload}
            />
          ))}
        </ul>
      </section>

      <section className="card">
        <h2 className="card-title">Intendances</h2>
        <CreateRow
          fields={[
            { key: "nom", placeholder: "Nom de l'intendance" },
            { key: "pays", placeholder: "Pays" },
            { key: "ville", placeholder: "Ville" },
          ]}
          select={{
            key: "coordination_id",
            placeholder: "Coordination",
            options: (coordinations.data ?? []).map((c) => ({ value: c.id, label: c.nom })),
          }}
          onSubmit={(v) =>
            guard(
              createIntendance(token, {
                nom: v.nom ?? "",
                pays: v.pays,
                ville: v.ville,
                coordination_id: v.coordination_id,
              }),
              intendances.reload,
            )
          }
        />
        <ul className="list">
          {(intendances.data ?? []).map((i) => (
            <OrgItemRow
              key={i.id}
              token={token}
              entity="intendances"
              id={i.id}
              nom={i.nom}
              meta={[[i.ville, i.pays].filter(Boolean).join(", "), i.coordination].filter(Boolean).join(" . ") || undefined}
              publie={i.publie}
              onChanged={intendances.reload}
            />
          ))}
        </ul>
      </section>

      <section className="card">
        <h2 className="card-title">Sous-commissions</h2>
        <CreateRow
          fields={[{ key: "nom", placeholder: "Nom de la sous-commission" }]}
          select={{
            key: "commission_id",
            placeholder: "Commission",
            options: (commissions.data ?? []).map((c) => ({ value: c.id, label: c.nom })),
          }}
          onSubmit={(v) =>
            guard(
              createSousCommission(token, { nom: v.nom ?? "", commission_id: v.commission_id }),
              sousCommissions.reload,
            )
          }
        />
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
              onChanged={sousCommissions.reload}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}

interface CreateRowProps {
  fields: { key: string; placeholder: string }[];
  select?: { key: string; placeholder: string; options: { value: string; label: string }[] };
  onSubmit: (values: Record<string, string | undefined>) => void;
}

function CreateRow({ fields, select, onSubmit }: CreateRowProps): JSX.Element {
  const [values, setValues] = useState<Record<string, string | undefined>>({});
  return (
    <form
      className="toolbar"
      onSubmit={(e) => {
        e.preventDefault();
        const nom = values.nom?.trim();
        if (!nom) return;
        onSubmit(values);
        setValues({});
      }}
    >
      {fields.map((f) => (
        <input
          key={f.key}
          className="search"
          placeholder={f.placeholder}
          value={values[f.key] ?? ""}
          onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
        />
      ))}
      {select && (
        <select
          className="search"
          value={values[select.key] ?? ""}
          onChange={(e) => setValues((v) => ({ ...v, [select.key]: e.target.value || undefined }))}
        >
          <option value="">{select.placeholder}</option>
          {select.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
      <button type="submit" className="btn btn-primary btn-inline">
        + Ajouter
      </button>
    </form>
  );
}
