import { useCallback, useState } from "react";

import {
  type VersionDocument,
  ajouterVersion,
  changerStatutDocument,
  creerDocumentInstitutionnel,
  getBibliotheque,
  getDocumentInstitutionnel,
  publierVersion,
} from "../api.js";
import { useResource } from "../useResource.js";
import { Pagination } from "./Pagination.js";

const CATEGORIES = [
  { cle: "statuts", libelle: "Statuts" },
  { cle: "reglement", libelle: "Règlement" },
  { cle: "charte", libelle: "Charte" },
  { cle: "procedure", libelle: "Procédure" },
  { cle: "note", libelle: "Note" },
  { cle: "formulaire", libelle: "Formulaire" },
];

const VISIBILITES = [
  { cle: "gouvernance", libelle: "Gouvernance seule" },
  { cle: "membres", libelle: "Tous les membres" },
  { cle: "public", libelle: "Public" },
];

const STATUT_BADGE: Record<string, string> = {
  brouillon: "badge-mut",
  publie: "badge-ok",
  archive: "badge-warn",
};

function date(iso: string | null): string {
  if (!iso) return "date inconnue";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

/** One document opened: its versions, and the editor that opens the next one. */
function Fiche({
  token,
  documentId,
  canGerer,
  onChange,
}: {
  token: string;
  documentId: string;
  canGerer: boolean;
  onChange: () => void;
}): JSX.Element {
  const [rechargement, setRechargement] = useState(0);
  const charge = useCallback(() => getDocumentInstitutionnel(token, documentId), [token, documentId, rechargement]);
  const res = useResource(charge, [token, documentId, rechargement]);
  const [contenu, setContenu] = useState("");
  const [contenuEn, setContenuEn] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [ouverte, setOuverte] = useState<string | null>(null);

  const d = res.data;

  async function nouvelleVersion(publier: boolean): Promise<void> {
    if (!contenu.trim()) return;
    setBusy(true);
    setErreur(null);
    setNote(null);
    try {
      const r = await ajouterVersion(token, documentId, {
        contenu: contenu.trim(),
        contenu_en: contenuEn.trim() || undefined,
        notes: notes.trim() || undefined,
        publier,
      });
      setNote(
        publier
          ? `Version ${r.version} publiée. Les versions précédentes restent lisibles.`
          : `Version ${r.version} enregistrée en brouillon. Elle n'est visible de personne tant qu'elle n'est pas publiée.`,
      );
      setContenu("");
      setContenuEn("");
      setNotes("");
      setRechargement((v) => v + 1);
      onChange();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible");
    } finally {
      setBusy(false);
    }
  }

  async function publier(v: VersionDocument): Promise<void> {
    setBusy(true);
    setErreur(null);
    try {
      await publierVersion(token, documentId, v.id);
      setNote(`Version ${v.version} publiée.`);
      setRechargement((x) => x + 1);
      onChange();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Publication impossible");
    } finally {
      setBusy(false);
    }
  }

  async function statut(nouveau: string): Promise<void> {
    setBusy(true);
    setErreur(null);
    try {
      await changerStatutDocument(token, documentId, nouveau);
      setNote(
        nouveau === "archive"
          ? "Document archivé. Il disparaît des lecteurs mais reste lisible ici."
          : `Document passé en ${nouveau}.`,
      );
      setRechargement((x) => x + 1);
      onChange();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Changement impossible");
    } finally {
      setBusy(false);
    }
  }

  if (res.loading) return <p className="muted">Chargement du document...</p>;
  if (res.error) return <p className="banner banner-error">{res.error}</p>;
  if (!d) return <></>;

  return (
    <section className="card">
      <h2 className="card-title">
        {d.titre} <span className={`badge ${STATUT_BADGE[d.statut] ?? "badge-mut"}`}>{d.statut}</span>
      </h2>
      <p className="muted">
        {d.description || "Aucune description."} Clé <span className="mono">{d.cle}</span>,{" "}
        {CATEGORIES.find((c) => c.cle === d.categorie)?.libelle ?? d.categorie}, visible par{" "}
        {VISIBILITES.find((v) => v.cle === d.visibilite)?.libelle ?? d.visibilite}.
      </p>

      {note && <p className="banner banner-ok">{note}</p>}
      {erreur && <p className="banner banner-error">{erreur}</p>}

      {canGerer && (
        <div className="form-actions">
          {d.statut !== "publie" && (
            <button type="button" className="btn" disabled={busy} onClick={() => void statut("publie")}>
              Rendre visible
            </button>
          )}
          {d.statut !== "archive" && (
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void statut("archive")}>
              Archiver
            </button>
          )}
          {d.statut === "archive" && (
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void statut("brouillon")}>
              Remettre en brouillon
            </button>
          )}
        </div>
      )}

      <p className="section-title">Versions ({d.versions})</p>
      {d.versions_detail.length === 0 && (
        <p className="banner banner-info">Aucune version. Rédigez la première ci-dessous.</p>
      )}
      <ul className="list">
        {d.versions_detail.map((v) => (
          <li key={v.id} className="list-row">
            <div className="event-main">
              <strong>
                Version {v.version}
                {v.publiee ? "" : " (brouillon)"}
              </strong>
              <span className="muted">
                {v.publiee ? `publiée le ${date(v.publie_le)}` : `rédigée le ${date(v.cree_le)}`}
                {v.publie_par ? ` par ${v.publie_par}` : ""}
                {v.empreinte ? ` · empreinte ${v.empreinte}` : ""}
              </span>
              {v.notes && <span className="muted">{v.notes}</span>}
              {ouverte === v.id && (
                <div style={{ whiteSpace: "pre-wrap", padding: "8px 0", fontSize: 13 }}>
                  {v.contenu || "Aucun texte français."}
                  {v.contenu_en && (
                    <>
                      <br />
                      <br />
                      <em>{v.contenu_en}</em>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="row-actions">
              <button
                type="button"
                className="btn btn-ghost btn-inline"
                onClick={() => setOuverte(ouverte === v.id ? null : v.id)}
              >
                {ouverte === v.id ? "Masquer" : "Lire"}
              </button>
              {canGerer && !v.publiee && (
                <button type="button" className="btn btn-inline" disabled={busy} onClick={() => void publier(v)}>
                  Publier
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {canGerer && (
        <>
          <p className="section-title">Rédiger la version suivante</p>
          <p className="muted">
            Une version publiée n&apos;est jamais modifiée. Une correction ouvre la version suivante, pour
            que ce qui a été signé reste lisible tel quel.
          </p>
          <label className="field">
            <span>Texte français</span>
            <textarea
              className="textarea"
              rows={8}
              value={contenu}
              onChange={(e) => setContenu(e.target.value)}
              placeholder="Le texte du document, tel qu'il sera lu."
            />
          </label>
          <label className="field">
            <span>Texte anglais</span>
            <textarea
              className="textarea"
              rows={6}
              value={contenuEn}
              onChange={(e) => setContenuEn(e.target.value)}
              placeholder="Facultatif. Sans traduction, le lecteur anglophone voit le texte français."
            />
          </label>
          <label className="field">
            <span>Note de version</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ce qui change, en une ligne" />
          </label>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !contenu.trim()}
              onClick={() => void nouvelleVersion(true)}
            >
              Enregistrer et publier
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy || !contenu.trim()}
              onClick={() => void nouvelleVersion(false)}
            >
              Enregistrer en brouillon
            </button>
          </div>
        </>
      )}
    </section>
  );
}

/**
 * The institution's own documents: statutes, rules, charters, procedures.
 *
 * Consent texts were the only institutional writing the platform held, under a single
 * active flag: publishing a new version silently hid the previous one, so a member who
 * signed version 2 could no longer read what version 2 said.
 */
export function Bibliotheque({ token, canGerer }: { token: string; canGerer: boolean }): JSX.Element {
  const [page, setPage] = useState(1);
  const [taille, setTaille] = useState(10);
  const [statut, setStatut] = useState<string | undefined>(undefined);
  const [rechargement, setRechargement] = useState(0);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [creation, setCreation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const [cle, setCle] = useState("");
  const [titre, setTitre] = useState("");
  const [titreEn, setTitreEn] = useState("");
  const [categorie, setCategorie] = useState("reglement");
  const [visibilite, setVisibilite] = useState("membres");
  const [description, setDescription] = useState("");

  const charge = useCallback(
    () => getBibliotheque(token, page, taille, statut),
    [token, page, taille, statut, rechargement],
  );
  const res = useResource(charge, [token, page, taille, statut, rechargement]);
  const data = res.data;

  async function creer(): Promise<void> {
    if (!cle.trim() || !titre.trim()) return;
    setBusy(true);
    setErreur(null);
    try {
      const r = await creerDocumentInstitutionnel(token, {
        cle: cle.trim(),
        titre: titre.trim(),
        titre_en: titreEn.trim() || undefined,
        categorie,
        visibilite,
        description: description.trim() || undefined,
      });
      setCreation(false);
      setCle("");
      setTitre("");
      setTitreEn("");
      setDescription("");
      setOuvert(r.id);
      setRechargement((v) => v + 1);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Création impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="card">
        <h2 className="card-title">Bibliothèque institutionnelle</h2>
        <p className="muted">
          Les documents de l&apos;organisation, avec leurs versions. Une version publiée n&apos;est
          jamais réécrite : une correction ouvre la suivante, pour que ce qui a été lu et signé
          reste consultable tel quel.
        </p>

        <div className="chips">
          {[
            { cle: undefined, libelle: "Tous" },
            { cle: "brouillon", libelle: "Brouillons" },
            { cle: "publie", libelle: "Publiés" },
            { cle: "archive", libelle: "Archivés" },
          ].map((f) => (
            <button
              key={f.libelle}
              type="button"
              className={`chip${statut === f.cle ? " chip-active" : ""}`}
              onClick={() => {
                setStatut(f.cle);
                setPage(1);
              }}
            >
              {f.libelle}
              {f.cle && data?.resume[f.cle] ? ` (${data.resume[f.cle]})` : ""}
            </button>
          ))}
        </div>

        {erreur && <p className="banner banner-error">{erreur}</p>}
        {res.loading && <p className="muted">Chargement...</p>}
        {res.error && <p className="banner banner-error">{res.error}</p>}
        {!res.loading && (data?.items.length ?? 0) === 0 && (
          <p className="banner banner-info">
            Aucun document dans cette vue. Créez le premier : les statuts, le règlement intérieur ou
            une charte.
          </p>
        )}

        {(data?.items.length ?? 0) > 0 && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Catégorie</th>
                  <th>Visible par</th>
                  <th>Version publiée</th>
                  <th>État</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((d) => (
                  <tr key={d.id}>
                    <td>
                      <strong>{d.titre}</strong>
                      <br />
                      <span className="muted mono">{d.cle}</span>
                    </td>
                    <td>{CATEGORIES.find((c) => c.cle === d.categorie)?.libelle ?? d.categorie}</td>
                    <td>{VISIBILITES.find((v) => v.cle === d.visibilite)?.libelle ?? d.visibilite}</td>
                    <td>
                      {d.version_publiee ? `v${d.version_publiee}` : "aucune"}
                      <br />
                      <span className="muted">
                        {d.versions} {d.versions > 1 ? "versions" : "version"}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${STATUT_BADGE[d.statut] ?? "badge-mut"}`}>{d.statut}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-inline"
                        onClick={() => setOuvert(ouvert === d.id ? null : d.id)}
                      >
                        {ouvert === d.id ? "Fermer" : "Ouvrir"}
                      </button>
                    </td>
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
            libelle="documents"
          />
        )}

        {canGerer && (
          <div className="form-actions">
            <button type="button" className="btn btn-primary" onClick={() => setCreation((v) => !v)}>
              {creation ? "Annuler" : "Nouveau document"}
            </button>
          </div>
        )}

        {creation && canGerer && (
          <>
            <p className="section-title">Nouveau document</p>
            <div className="form-grid">
              <label className="field">
                <span>Clé</span>
                <input value={cle} onChange={(e) => setCle(e.target.value)} placeholder="reglement-interieur" />
              </label>
              <label className="field">
                <span>Titre</span>
                <input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Règlement intérieur" />
              </label>
              <label className="field">
                <span>Titre anglais</span>
                <input value={titreEn} onChange={(e) => setTitreEn(e.target.value)} placeholder="Facultatif" />
              </label>
              <label className="field">
                <span>Catégorie</span>
                <select value={categorie} onChange={(e) => setCategorie(e.target.value)}>
                  {CATEGORIES.map((c) => (
                    <option key={c.cle} value={c.cle}>
                      {c.libelle}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Visible par</span>
                <select value={visibilite} onChange={(e) => setVisibilite(e.target.value)}>
                  {VISIBILITES.map((v) => (
                    <option key={v.cle} value={v.cle}>
                      {v.libelle}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Description</span>
                <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="À quoi sert ce document" />
              </label>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-primary" disabled={busy || !cle.trim() || !titre.trim()} onClick={() => void creer()}>
                Créer le document
              </button>
            </div>
          </>
        )}
      </section>

      {ouvert && (
        <Fiche token={token} documentId={ouvert} canGerer={canGerer} onChange={() => setRechargement((v) => v + 1)} />
      )}
    </>
  );
}
