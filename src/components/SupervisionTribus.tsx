import { useCallback, useState } from "react";

import {
  type Supervision,
  cloreSupervision,
  designerSupervision,
  listEquipesSpeciales,
  getMembres,
  getSupervisions,
} from "../api.js";
import { useResource } from "../useResource.js";
import { Pagination } from "./Pagination.js";

const ROLES = [
  { cle: "superviseur", libelle: "Superviseur" },
  { cle: "referent", libelle: "Référent" },
  { cle: "accompagnateur", libelle: "Accompagnateur" },
];

function periode(s: Supervision): string {
  const debut = s.debut ? new Date(s.debut).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "date inconnue";
  if (!s.fin) return `depuis le ${debut}`;
  const fin = new Date(s.fin).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  return `du ${debut} au ${fin}`;
}

/**
 * Who answers for which tribe, since when, and appointed by whom.
 *
 * A tribe has a patriarche, and the patriarche must belong to the tribe. Supervision
 * is a different relation: whoever answers for a tribe before the governance is often
 * external to it, and one person can carry several. Nothing recorded that, so the
 * question had no answer.
 *
 * Tribes with nobody answering for them are listed first, because that gap is the
 * reason this screen exists and it should not have to be found by scrolling.
 */
export function SupervisionTribus({ token, canGerer }: { token: string; canGerer: boolean }): JSX.Element {
  const [page, setPage] = useState(1);
  const [taille, setTaille] = useState(10);
  const [closes, setCloses] = useState(false);
  const [rechargement, setRechargement] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [tribuId, setTribuId] = useState("");
  const [porteurType, setPorteurType] = useState<"membre" | "equipe">("membre");
  const [porteurId, setPorteurId] = useState("");
  const [role, setRole] = useState("superviseur");
  const [motif, setMotif] = useState("");
  const [recherche, setRecherche] = useState("");

  const charge = useCallback(
    () => getSupervisions(token, { inclureCloses: closes, page, taille }),
    [token, closes, page, taille, rechargement],
  );
  const res = useResource(charge, [token, closes, page, taille, rechargement]);
  const equipes = useResource(() => listEquipesSpeciales(token), [token]);
  const membres = useResource(
    () => (recherche.trim().length >= 2 ? getMembres(token, { q: recherche.trim(), limit: 8 }) : Promise.resolve([])),
    [token, recherche],
  );

  const data = res.data;
  const sans = data?.tribus_sans_supervision ?? [];

  async function designer(): Promise<void> {
    if (!tribuId || !porteurId) return;
    setBusy(true);
    setErreur(null);
    setNote(null);
    try {
      await designerSupervision(token, {
        tribu_id: tribuId,
        ...(porteurType === "membre" ? { membre_id: porteurId } : { equipe_speciale_id: porteurId }),
        role,
        motif: motif.trim() || undefined,
      });
      setNote("Supervision enregistrée. La tribu a désormais quelqu'un qui en répond.");
      setTribuId("");
      setPorteurId("");
      setMotif("");
      setRecherche("");
      setRechargement((v) => v + 1);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Désignation impossible");
    } finally {
      setBusy(false);
    }
  }

  async function clore(s: Supervision): Promise<void> {
    setBusy(true);
    setErreur(null);
    setNote(null);
    try {
      await cloreSupervision(token, s.id);
      setNote(`Supervision close. La période reste consultable dans l'historique.`);
      setRechargement((v) => v + 1);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Clôture impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="card">
        <h2 className="card-title">Supervision des tribus</h2>
        <p className="muted">
          Qui répond d&apos;une tribu devant la gouvernance. Distinct du patriarche, qui doit
          appartenir à la tribu : un superviseur peut lui être extérieur, et une équipe spéciale
          peut porter la responsabilité. Une supervision n&apos;est jamais écrasée, elle est close
          et son historique reste lisible.
        </p>

        {note && <p className="banner banner-ok">{note}</p>}
        {erreur && <p className="banner banner-error">{erreur}</p>}

        {sans.length > 0 && (
          <p className="banner banner-info">
            {sans.length === 1
              ? "1 tribu n'a personne qui en répond : "
              : `${sans.length} tribus n'ont personne qui en répond : `}
            {sans.map((t) => t.nom).join(", ")}.
          </p>
        )}
      </section>

      {canGerer && (
        <section className="card">
          <h2 className="card-title">Désigner une supervision</h2>
          <div className="form-grid">
            <label className="field">
              <span>Tribu</span>
              <select value={tribuId} onChange={(e) => setTribuId(e.target.value)}>
                <option value="">Choisir une tribu</option>
                {sans.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nom} (sans supervision)
                  </option>
                ))}
                {(data?.items ?? [])
                  .filter((s) => s.en_cours && !sans.some((t) => t.id === s.tribu.id))
                  .map((s) => s.tribu)
                  .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nom}
                    </option>
                  ))}
              </select>
            </label>

            <label className="field">
              <span>Porté par</span>
              <select
                value={porteurType}
                onChange={(e) => {
                  setPorteurType(e.target.value as "membre" | "equipe");
                  setPorteurId("");
                }}
              >
                <option value="membre">Une personne</option>
                <option value="equipe">Une équipe spéciale</option>
              </select>
            </label>

            {porteurType === "equipe" ? (
              <label className="field">
                <span>Équipe</span>
                <select value={porteurId} onChange={(e) => setPorteurId(e.target.value)}>
                  <option value="">Choisir une équipe</option>
                  {(equipes.data ?? [])
                    .filter((eq) => eq.active)
                    .map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.nom}
                      </option>
                    ))}
                </select>
              </label>
            ) : (
              <label className="field">
                <span>Personne</span>
                <input
                  value={recherche}
                  onChange={(e) => {
                    setRecherche(e.target.value);
                    setPorteurId("");
                  }}
                  placeholder="Nom, matricule ou adresse"
                />
                {(membres.data ?? []).length > 0 && (
                  <select value={porteurId} onChange={(e) => setPorteurId(e.target.value)} size={4}>
                    {(membres.data ?? []).map((m) => (
                      <option key={m.id} value={m.id}>
                        {[m.prenoms, m.nom].filter(Boolean).join(" ")} {m.matricule ? `(${m.matricule})` : ""}
                      </option>
                    ))}
                  </select>
                )}
                {recherche.trim().length >= 2 && (membres.data ?? []).length === 0 && !membres.loading && (
                  <span className="muted small">Aucun membre ne correspond.</span>
                )}
              </label>
            )}

            <label className="field">
              <span>Rôle</span>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                {ROLES.map((r) => (
                  <option key={r.cle} value={r.cle}>
                    {r.libelle}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Motif</span>
              <input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Facultatif" />
            </label>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !tribuId || !porteurId}
              onClick={() => void designer()}
            >
              {busy ? "Enregistrement..." : "Désigner"}
            </button>
          </div>
        </section>
      )}

      <section className="card">
        <h2 className="card-title">
          {closes ? "Supervisions, historique compris" : "Supervisions en cours"}
        </h2>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={() => { setCloses((v) => !v); setPage(1); }}>
            {closes ? "N'afficher que celles en cours" : "Afficher aussi les supervisions closes"}
          </button>
        </div>

        {res.loading && <p className="muted">Chargement...</p>}
        {res.error && <p className="banner banner-error">{res.error}</p>}
        {!res.loading && (data?.items.length ?? 0) === 0 && (
          <p className="banner banner-info">Aucune supervision enregistrée pour le moment.</p>
        )}

        {(data?.items.length ?? 0) > 0 && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tribu</th>
                  <th>Qui en répond</th>
                  <th>Rôle</th>
                  <th>Période</th>
                  <th>Désignée par</th>
                  {canGerer && <th />}
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.tribu.nom}</strong>
                    </td>
                    <td>
                      {s.porteur.libelle}
                      <br />
                      <span className="muted">
                        {s.porteur.type === "equipe" ? "équipe spéciale" : s.porteur.matricule ?? "personne"}
                      </span>
                    </td>
                    <td>{ROLES.find((r) => r.cle === s.role)?.libelle ?? s.role}</td>
                    <td>
                      {periode(s)}
                      {s.motif && (
                        <>
                          <br />
                          <span className="muted">{s.motif}</span>
                        </>
                      )}
                    </td>
                    <td className="muted">{s.attribue_par ?? "non renseigné"}</td>
                    {canGerer && (
                      <td>
                        {s.en_cours ? (
                          <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => void clore(s)}>
                            Clore
                          </button>
                        ) : (
                          <span className="badge badge-mut">Close</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && (
          <Pagination
            page={data.page}
            pages={data.pages}
            total={data.total}
            taille={data.taille}
            onPage={setPage}
            onTaille={(t) => {
              setTaille(t);
              setPage(1);
            }}
            libelle="supervisions"
          />
        )}
      </section>
    </>
  );
}
