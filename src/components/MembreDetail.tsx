import { useEffect, useState } from "react";

import {
  ApiError,
  type DossierDocument,
  type MembreUpdateInput,
  bloquerMembre,
  debloquerMembre,
  demanderDocumentMembre,
  fetchDocumentContentUrl,
  getCommissions,
  getConnexions,
  getDossierInscription,
  getMembre,
  getMembrePhotoUrl,
  supprimerMembre,
  updateMembre,
} from "../api.js";
import { formatDate, fullName, initials } from "../format.js";
import { useResource } from "../useResource.js";
import { MembreFonction } from "./MembreFonction.js";

interface MembreDetailProps {
  token: string;
  id: string;
  onBack: () => void;
}

export function MembreDetail({ token, id, onBack }: MembreDetailProps): JSX.Element {
  const membre = useResource(() => getMembre(token, id), [token, id]);
  const commissions = useResource(() => getCommissions(token), [token]);
  const connexions = useResource(() => getConnexions(token, id), [token, id]);
  const dossier = useResource(() => getDossierInscription(token, id), [token, id]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [docType, setDocType] = useState("piece_identite");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setPhotoUrl(null);
    getMembrePhotoUrl(token, id)
      .then((r) => {
        if (active) setPhotoUrl(r.url);
      })
      .catch(() => {
        if (active) setPhotoUrl(null);
      });
    return () => {
      active = false;
    };
  }, [token, id]);

  async function manage(action: () => Promise<unknown>, message: string, back?: boolean): Promise<void> {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      await action();
      if (back) {
        onBack();
        return;
      }
      membre.reload();
      setNote(message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  async function patch(input: MembreUpdateInput, message: string): Promise<void> {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      await updateMembre(token, id, input);
      membre.reload();
      setNote(message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  if (membre.loading) return <div className="page muted">Chargement...</div>;
  if (membre.error || !membre.data) return <div className="page banner banner-error">{membre.error ?? "Introuvable"}</div>;

  const m = membre.data;
  const name = fullName(m.prenoms, m.nom, m.matricule);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <button type="button" className="link" onClick={onBack}>
            Annuaire
          </button>
          <h1>{name}</h1>
          <p className="mono muted">
            {m.matricule} . {m.verifie ? "VERIFIE" : "NON VERIFIE"} . {m.statut.toUpperCase()}
          </p>
        </div>
        {photoUrl ? (
          <img
            className="avatar"
            src={photoUrl}
            alt={`Photo de ${name}`}
            style={{ objectFit: "cover" }}
            onError={() => setPhotoUrl(null)}
          />
        ) : (
          <div className="avatar">{initials(name)}</div>
        )}
      </header>

      {note && <p className="banner banner-ok">{note}</p>}
      {error && <p className="banner banner-error">{error}</p>}

      <section className="card">
        <h2 className="card-title">Informations générales</h2>
        <dl className="detail-grid">
          <div>
            <dt>Telephone</dt>
            <dd>{m.telephone ?? "-"}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{m.email}</dd>
          </div>
          <div>
            <dt>Genre & Age</dt>
            <dd>{genreAge(m.genre, m.date_naissance)}</dd>
          </div>
          <div>
            <dt>Localisation</dt>
            <dd>{[m.ville, m.pays].filter(Boolean).join(", ") || "-"}</dd>
          </div>
          <div>
            <dt>Structure</dt>
            <dd>{m.intendance ?? "-"}</dd>
          </div>
          <div>
            <dt>Commission</dt>
            <dd>{m.commission ?? "-"}</dd>
          </div>
          <div>
            <dt>Berger Referent</dt>
            <dd>{m.berger ?? "Aucun"}</dd>
          </div>
          <div>
            <dt>Membre depuis</dt>
            <dd>{m.date_entree ? formatDate(m.date_entree) : "-"}</dd>
          </div>
          <div>
            <dt>Cheminement pastoral</dt>
            <dd>{cheminementLabel(m.cheminement_pastoral)}</dd>
          </div>
          <div>
            <dt>Groupe</dt>
            <dd>{m.groupe ?? "-"}</dd>
          </div>
        </dl>
      </section>

      <section className="card">
        <h2 className="card-title">Vie communautaire</h2>
        <dl className="detail-grid">
          <div>
            <dt>Tribu</dt>
            <dd>{m.tribu ?? "-"}</dd>
          </div>
          <div>
            <dt>Patriarche de la tribu</dt>
            <dd>{m.patriarche ?? "-"}</dd>
          </div>
          <div>
            <dt>Niveau d'engagement</dt>
            <dd>{typeMembreLabel(m.type_membre)}</dd>
          </div>
          <div>
            <dt>Promotion</dt>
            <dd>{m.promotion ?? "-"}</dd>
          </div>
          <div>
            <dt>Coordination</dt>
            <dd>{m.coordination ?? "-"}</dd>
          </div>
          <div>
            <dt>Coordinateur general</dt>
            <dd>{m.coordinateur ?? "-"}</dd>
          </div>
        </dl>
      </section>

      <section className="card">
        <h2 className="card-title">Situation personnelle</h2>
        <dl className="detail-grid">
          <div>
            <dt>Situation matrimoniale</dt>
            <dd>{situationLabel(m.situation_matrimoniale, m.type_mariage)}</dd>
          </div>
          <div>
            <dt>Profession</dt>
            <dd>{m.profession ?? "-"}</dd>
          </div>
          <div>
            <dt>Niveau d'études</dt>
            <dd>{m.niveau_etudes ?? "-"}</dd>
          </div>
          <div>
            <dt>Sacrements</dt>
            <dd>{sacrements(m.baptise, m.confirme, m.premiere_communion)}</dd>
          </div>
        </dl>
      </section>

      <section className="card">
        <h2 className="card-title">Affectation</h2>
        <label className="full">
          <span>Commission</span>
          <select
            defaultValue=""
            disabled={busy}
            onChange={(e) => {
              if (e.target.value) void patch({ commission_id: e.target.value }, "Commission mise a jour.");
            }}
          >
            <option value="">Changer de commission...</option>
            {(commissions.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </label>
      </section>

      <MembreFonction token={token} membre={m} onChanged={() => membre.reload()} />

      <MembreDocuments token={token} documents={dossier.data?.documents ?? []} loading={dossier.loading} onError={setError} />

      <div className="form-actions">
        {!m.verifie && (
          <button
            type="button"
            className="btn btn-primary btn-inline"
            disabled={busy}
            onClick={() => void patch({ verifie: true }, "Identite validee.")}
          >
            Valider l'identite
          </button>
        )}
        {m.statut === "actif" ? (
          <button
            type="button"
            className="btn btn-ghost btn-inline"
            disabled={busy}
            onClick={() => void patch({ statut: "inactif" }, "Membre desactive.")}
          >
            Desactiver
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-ghost btn-inline"
            disabled={busy}
            onClick={() => void patch({ statut: "actif" }, "Membre reactive.")}
          >
            Reactiver
          </button>
        )}
      </div>

      <section className="card">
        <h2 className="card-title">Connexions récentes (sécurité)</h2>
        {connexions.loading ? (
          <p className="muted small">Chargement...</p>
        ) : connexions.error ? (
          <p className="muted small">{connexions.error}</p>
        ) : (connexions.data ?? []).length === 0 ? (
          <p className="muted small">Aucune connexion enregistree.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Adresse IP</th>
                <th>Appareil</th>
                <th>Etat</th>
              </tr>
            </thead>
            <tbody>
              {(connexions.data ?? []).map((c, i) => (
                <tr key={i}>
                  <td>{c.cree_le ? formatDateTime(c.cree_le) : "-"}</td>
                  <td className="mono">{cleanIp(c.ip)}</td>
                  <td className="muted">{deviceLabel(c.appareil)}</td>
                  <td>{c.revoque ? "Revoquee" : "Active"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card" style={{ borderColor: "var(--adsum-danger)" }}>
        <h2 className="card-title">Gestion avancee (administration)</h2>
        <div className="toolbar">
          <select className="search" value={docType} onChange={(e) => setDocType(e.target.value)}>
            <option value="piece_identite">Piece d'identite</option>
            <option value="passeport">Passeport</option>
            <option value="permis">Permis de conduire</option>
            <option value="carte_consulaire">Carte consulaire</option>
            <option value="justificatif_domicile">Justificatif de domicile</option>
            <option value="photo_identite">Photo d'identite</option>
          </select>
          <button
            type="button"
            className="btn btn-ghost btn-inline"
            disabled={busy}
            onClick={() => void manage(() => demanderDocumentMembre(token, id, docType), "Document demande au membre.")}
          >
            Demander ce document
          </button>
        </div>
        <div className="form-actions" style={{ justifyContent: "flex-start", marginTop: 8 }}>
          <button
            type="button"
            className="btn btn-ghost btn-inline"
            disabled={busy}
            onClick={() => void manage(() => bloquerMembre(token, id), "Compte bloque.")}
          >
            Bloquer le compte
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-inline"
            disabled={busy}
            onClick={() => void manage(() => debloquerMembre(token, id), "Compte debloque.")}
          >
            Debloquer
          </button>
          {confirmDelete ? (
            <>
              <span className="muted small">Confirmér la suppression definitive (RGPD) ?</span>
              <button
                type="button"
                className="btn btn-primary btn-inline"
                style={{ background: "var(--adsum-danger)" }}
                disabled={busy}
                onClick={() => void manage(() => supprimerMembre(token, id), "Membre supprime.", true)}
              >
                Oui, supprimer et purger
              </button>
              <button type="button" className="btn btn-ghost btn-inline" onClick={() => setConfirmDelete(false)}>
                Annuler
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => setConfirmDelete(true)}>
              Supprimer (RGPD)
            </button>
          )}
        </div>
        <p className="muted small">La suppression efface le membre, son compte, ses demandes, ses documents et ses fichiers (photos, pieces) dans le stockage. Action irreversible.</p>
      </section>
    </div>
  );
}

const CHEMINEMENT_LABELS: Record<string, string> = {
  nouveau: "Nouveau",
  en_accompagnement: "En accompagnement",
  membre_actif: "Membre actif",
  responsable: "Responsable",
  a_relancer: "A relancer",
  en_pause: "En pause",
  ancien_membre: "Ancien membre",
};

function cheminementLabel(value: string | null): string {
  if (!value) return "-";
  return CHEMINEMENT_LABELS[value] ?? value;
}

function genreAge(genre: string | null, naissance: string | null): string {
  const g = genre ? genre.charAt(0).toUpperCase() + genre.slice(1) : null;
  let age: number | null = null;
  if (naissance) {
    const d = new Date(naissance);
    if (!Number.isNaN(d.getTime())) {
      age = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
    }
  }
  if (g && age !== null) return `${g} (${age} ans)`;
  if (g) return g;
  if (age !== null) return `${age} ans`;
  return "-";
}

const TYPE_MEMBRE_LABELS: Record<string, string> = {
  membre_simple: "Membre simple",
  nouveau_engage: "Nouveau engage",
  aspirant: "Aspirant",
  engage: "Engage",
  berger: "Berger",
  responsable: "Responsable",
};

function typeMembreLabel(value: string | null): string {
  if (!value) return "-";
  return TYPE_MEMBRE_LABELS[value] ?? value;
}

const SITUATION_LABELS: Record<string, string> = {
  celibataire: "Celibataire",
  en_couple: "En couple (cheminement)",
  fiance: "Fiance",
  marie: "Marie",
  veuf: "Veuf / Veuve",
  divorce: "Divorce",
};
const MARIAGE_LABELS: Record<string, string> = {
  dot: "dot",
  religieux: "religieux",
  dot_et_religieux: "dot et religieux",
  civil: "civil",
};

function situationLabel(situation: string | null, mariage: string | null): string {
  if (!situation) return "-";
  const base = SITUATION_LABELS[situation] ?? situation;
  if (situation === "marie" && mariage) return `${base} (${MARIAGE_LABELS[mariage] ?? mariage})`;
  return base;
}

function sacrements(baptise: boolean | null, confirme: boolean | null, communion: boolean | null): string {
  const list: string[] = [];
  if (baptise) list.push("Baptisé");
  if (confirme) list.push("Confirmé");
  if (communion) list.push("Première communion");
  return list.length > 0 ? list.join(", ") : "Non renseigne";
}

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function cleanIp(ip: string | null): string {
  if (!ip) return "-";
  // PostgreSQL inet renders host addresses with a /32 (IPv4) or /128 (IPv6) suffix.
  return ip.replace(/\/(32|128)$/, "");
}

function deviceLabel(ua: string | null): string {
  if (!ua) return "Inconnu";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iOS/i.test(ua)) return "iOS";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Macintosh|Mac OS/i.test(ua)) return "macOS";
  if (/Linux/i.test(ua)) return "Linux";
  return ua.length > 40 ? `${ua.slice(0, 40)}...` : ua;
}

const DOC_LABELS: Record<string, string> = {
  piece_identite: "Pièce d'identité",
  passeport: "Passeport",
  permis: "Permis de conduire",
  carte_consulaire: "Carte consulaire",
  justificatif_domicile: "Justificatif de domicile",
  photo_identite: "Photo d'identité",
  attestation_manuelle: "Attestation signée",
  autre: "Autre document",
};

/** Documents attached to the member, opened through the signed URL or, for
 * encrypted files, the audited decrypting endpoint. Read-only, admin-gated. */
function MembreDocuments({
  token,
  documents,
  loading,
  onError,
}: {
  token: string;
  documents: DossierDocument[];
  loading: boolean;
  onError: (msg: string) => void;
}): JSX.Element {
  async function open(doc: DossierDocument): Promise<void> {
    try {
      if (doc.url) {
        window.open(doc.url, "_blank", "noreferrer");
        return;
      }
      if (doc.content_path) {
        const objectUrl = await fetchDocumentContentUrl(token, doc.content_path);
        window.open(objectUrl, "_blank", "noreferrer");
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
      }
    } catch {
      onError("Document indisponible.");
    }
  }

  return (
    <section className="card">
      <h2 className="card-title">Documents liés</h2>
      {loading ? (
        <p className="muted">Chargement...</p>
      ) : documents.length === 0 ? (
        <p className="muted">Aucun document rattaché à ce membre.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Fichier</th>
              <th>Reçu le</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id}>
                <td>
                  {DOC_LABELS[doc.type] ?? doc.type}
                  {doc.chiffre ? <span className="badge badge-mut" style={{ marginLeft: 6 }}>chiffré</span> : null}
                </td>
                <td className="muted small">{doc.nom_fichier ?? "-"}</td>
                <td className="small">{doc.recu_le ? new Date(doc.recu_le).toLocaleString("fr-FR") : "-"}</td>
                <td>
                  {doc.url || doc.content_path ? (
                    <button type="button" className="btn btn-ghost btn-inline" onClick={() => void open(doc)}>
                      Ouvrir
                    </button>
                  ) : (
                    <button type="button" className="btn btn-ghost btn-inline" disabled>
                      Ouvrir
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
