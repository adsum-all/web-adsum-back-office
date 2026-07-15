import { useMemo, useState } from "react";

import {
  ApiError,
  type Coordination,
  type CoordinationInput,
  type Intendance,
  type IntendanceInput,
  type Tribu,
  createCoordination,
  createIntendance,
  createTribu,
  getCoordinations,
  getIntendances,
  getTribus,
  updateCoordination,
  updateIntendance,
} from "../api.js";
import { CONTINENTS, nomPays } from "../countries.js";
import { useResource } from "../useResource.js";
import { OrgItemRow } from "./OrgItemRow.js";
import { PaysCombo } from "./PaysCombo.js";
import { Tabs } from "./Tabs.js";

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
  const tribus = useResource(() => getTribus(token), [token]);
  const [error, setError] = useState<string | null>(null);
  const [editCoord, setEditCoord] = useState<string | null>(null);
  const [editIntend, setEditIntend] = useState<string | null>(null);
  const [qCoord, setQCoord] = useState("");
  const [qIntend, setQIntend] = useState("");
  const [qTribu, setQTribu] = useState("");
  const [filtrePays, setFiltrePays] = useState("");
  const [nomTribu, setNomTribu] = useState("");
  const [descTribu, setDescTribu] = useState("");
  const [tab, setTab] = useState<"coord" | "intend" | "tribu">("coord");

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

      <Tabs
        tabs={[
          { id: "coord", label: `Coordinations (${coords.length})` },
          { id: "intend", label: `Intendances (${intends.length})` },
          { id: "tribu", label: `Tribus (${(tribus.data ?? []).length})` },
        ]}
        active={tab}
        onChange={(id) => setTab(id as "coord" | "intend" | "tribu")}
      />

      {tab === "tribu" && (
      <section className="card">
        <h2 className="card-title">Tribus</h2>
        <p className="muted small">Référentiel des tribus, paramétrable (jamais codé en dur). Sélectionnable en liste déroulante lors des inscriptions.</p>
        <form
          className="form-card"
          onSubmit={(e) => {
            e.preventDefault();
            const nom = nomTribu.trim();
            if (nom) guard(createTribu(token, { nom, description: descTribu.trim() || undefined }), tribus.reload, () => { setNomTribu(""); setDescTribu(""); });
          }}
        >
          <div className="form-grid">
            <label><span>Nom *</span><input value={nomTribu} onChange={(e) => setNomTribu(e.target.value)} placeholder="Ex : ASHER" required /></label>
            <label><span>Description</span><input value={descTribu} onChange={(e) => setDescTribu(e.target.value)} /></label>
          </div>
          <div className="form-actions"><button type="submit" className="btn btn-primary btn-inline">+ Ajouter une tribu</button></div>
        </form>
        <div className="toolbar" style={{ marginTop: 8 }}>
          <input className="search" value={qTribu} onChange={(e) => setQTribu(e.target.value)} placeholder="Rechercher une tribu..." />
        </div>
        {tribus.error && <p className="banner banner-error">{tribus.error}</p>}
        <ul className="list">
          {(tribus.data ?? []).filter((t: Tribu) => match(t.nom, qTribu)).map((t: Tribu) => (
            <OrgItemRow
              key={t.id}
              token={token}
              entity="tribus"
              id={t.id}
              nom={t.nom}
              meta={t.description ?? undefined}
              publie={t.publie ?? true}
              edit={{ description: t.description ?? "" }}
              onChanged={tribus.reload}
            />
          ))}
        </ul>
        {!tribus.loading && (tribus.data ?? []).length === 0 && <p className="muted">Aucune tribu.</p>}
      </section>
      )}

      {tab === "coord" && (
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
      )}

      {tab === "intend" && (
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
          <PaysCombo value={filtrePays} onChange={setFiltrePays} placeholder="Filtrer par pays" />
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
      )}
    </div>
  );
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function match(nom: string, query: string): boolean {
  const q = norm(query.trim());
  return !q || norm(nom).includes(q);
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
          // Send null (not undefined) so an edit can clear a value; detaching a
          // parent must actually remove the link.
          description: description.trim() || null,
          pays_code: paysCode || null,
          continent: continent || null,
          ville: ville.trim() || null,
          statut,
          parent_id: lie && parentId ? parentId : null,
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
      <PaysCombo value={paysCode} onChange={setPaysCode} />
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
          // Send null (not undefined) so an edit can clear a value; detaching
          // the coordination or the parent intendance must remove the link.
          description: description.trim() || null,
          pays_code: paysCode || null,
          pays: paysCode ? nomPays(paysCode) : null,
          continent: continent || null,
          ville: ville.trim() || null,
          statut,
          coordination_id: lie && coordinationId ? coordinationId : null,
          parent_id: lie && parentId ? parentId : null,
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
      <PaysCombo value={paysCode} onChange={setPaysCode} />
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
