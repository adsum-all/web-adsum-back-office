import { useState } from "react";

import {
  type Attestation,
  type DecisionAttestation,
  type PaysSignature,
  type PaysSignaturePatch,
  getAttestations,
  getDocumentUrl,
  getPaysSignature,
  updatePaysSignature,
  validerAttestation,
} from "../api.js";
import { useResource } from "../useResource.js";
import { InfoTip } from "./InfoTip.js";
import { Tabs } from "./Tabs.js";
import { usePagination } from "../usePagination.js";
import { Pagination } from "./Pagination.js";

// Badge class and label per attestation status (awaiting an admin decision).
const STATUT_BADGE: Record<string, string> = {
  awaiting: "badge-mut",
  reminded: "badge-warn",
  overdue: "badge-bad",
  under_review: "badge-warn",
  rejected: "badge-bad",
};
const STATUT_LIBELLE: Record<string, string> = {
  awaiting: "En attente",
  reminded: "Relance",
  overdue: "En retard",
  under_review: "À examiner",
  rejected: "Refusée",
};

/**
 * Manual attestation queue plus the country e-signature legal matrix. The matrix
 * controls, per country, whether a hand-signed attestation is required in
 * addition to the electronic signature.
 */
export function Attestations({ token }: { token: string }): JSX.Element {
  const attestations = useResource(() => getAttestations(token), [token]);
  const pays = useResource(() => getPaysSignature(token), [token]);

  const fileAttente: Attestation[] = attestations.data ?? [];
  const matrice: PaysSignature[] = pays.data ?? [];
  const [tab, setTab] = useState<"file" | "pays">("file");

  const pagination = usePagination(fileAttente, 10);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Attestations & pays</h1>
          <p className="muted">
            Suivi des attestations manuscrites à valider et matrice juridique des pays.
          </p>
        </div>
      </header>

      <Tabs
        tabs={[
          { id: "file", label: fileAttente.length > 0 ? `File d'attente (${fileAttente.length})` : "File d'attente" },
          { id: "pays", label: "Matrice des pays" },
        ]}
        active={tab}
        onChange={(id) => setTab(id as "file" | "pays")}
      />

      {tab === "file" && (
      <section className="card">
        <h2 className="card-title">File d'attente des attestations</h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          Attestations manuscrites déposées par les membres, en attente d'un examen. Les dossiers en retard sont signalés.
        </p>
        {attestations.error && <p className="banner banner-error">{attestations.error}</p>}
        {attestations.loading && <p className="muted">Chargement...</p>}

        {!attestations.loading && fileAttente.length === 0 && !attestations.error && (
          <p className="muted">Aucune attestation en attente.</p>
        )}

        {fileAttente.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Membre</th>
                  <th>Pays</th>
                  <th>Statut</th>
                  <th>Échéance</th>
                  <th>Scan</th>
                  <th>Decision</th>
                </tr>
              </thead>
              <tbody>
                {pagination.page.map((a) => (
                  <AttestationRow key={a.id} token={token} item={a} onChanged={attestations.reload} />
                ))}
              </tbody>
            </table>
      <Pagination
        page={pagination.numero}
        pages={pagination.pages}
        total={pagination.total}
        taille={pagination.taille}
        onPage={pagination.setNumero}
        onTaille={pagination.setTaille}
        libelle="attestations"
      />
          </div>
        )}
      </section>
      )}

      {tab === "pays" && (
      <section className="card">
        <h2 className="card-title">
          Matrice juridique des pays
          <InfoTip
            title="Attestation manuscrite par pays"
            text="Ce tableau contrôle, pour chaque pays, si une attestation signée à la main est requise en plus de la signature électronique. C'est une aide opérationnelle, pas un avis juridique, et il est entièrement modifiable."
          />
        </h2>
        {pays.error && <p className="banner banner-error">{pays.error}</p>}
        {pays.loading && <p className="muted">Chargement...</p>}

        {!pays.loading && matrice.length === 0 && !pays.error && (
          <p className="muted">Aucun pays configuré.</p>
        )}

        {matrice.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Pays</th>
                  <th>E-signature reconnue</th>
                  <th>Attestation manuscrite</th>
                  <th>Source</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {matrice.map((p) => (
                  <PaysRow key={p.code_pays} token={token} pays={p} onChanged={pays.reload} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      )}
    </div>
  );
}

function AttestationRow({
  token,
  item,
  onChanged,
}: {
  token: string;
  item: Attestation;
  onChanged: () => void;
}): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enRetard = item.statut === "overdue";
  const examinable = item.statut === "under_review";

  async function decide(decision: DecisionAttestation): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await validerAttestation(token, item.id, decision);
      onChanged();
    } catch {
      setError("Action impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function ouvrirScan(): Promise<void> {
    if (!item.document_id) return;
    setBusy(true);
    setError(null);
    try {
      const { url } = await getDocumentUrl(token, item.document_id);
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        setError("Scan indisponible.");
      }
    } catch {
      setError("Scan indisponible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr>
      <td>
        {item.membre || "-"}
        <br />
        <span className="muted small">{item.email}</span>
      </td>
      <td>{item.pays || "-"}</td>
      <td>
        <span className={`badge ${STATUT_BADGE[item.statut] ?? "badge-mut"}`}>
          {STATUT_LIBELLE[item.statut] ?? item.statut}
        </span>
      </td>
      <td className="small" style={enRetard ? { color: "var(--adsum-danger, #b91c1c)", fontWeight: 600 } : undefined}>
        {item.echeance ? new Date(item.echeance).toLocaleDateString("fr-FR") : "-"}
      </td>
      <td>
        {item.document_id ? (
          <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => void ouvrirScan()}>
            Ouvrir le scan
          </button>
        ) : (
          <span className="muted small">Aucun dépôt</span>
        )}
      </td>
      <td>
        {examinable ? (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-primary btn-inline" disabled={busy} onClick={() => void decide("accepted")}>
              Valider
            </button>
            <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => void decide("rejected")}>
              Refuser
            </button>
          </div>
        ) : (
          <span className="muted small">En attente du dépôt</span>
        )}
        {error && <p className="banner banner-error" style={{ marginTop: 6 }}>{error}</p>}
      </td>
    </tr>
  );
}

function PaysRow({
  token,
  pays,
  onChanged,
}: {
  token: string;
  pays: PaysSignature;
  onChanged: () => void;
}): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState(pays.source ?? "");
  const [note, setNote] = useState(pays.note ?? "");

  async function patch(fields: PaysSignaturePatch): Promise<void> {
    setBusy(true);
    try {
      await updatePaysSignature(token, pays.code_pays, fields);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  function saveSource(): void {
    if (source === (pays.source ?? "")) return;
    void patch({ source });
  }

  function saveNote(): void {
    if (note === (pays.note ?? "")) return;
    void patch({ note });
  }

  return (
    <tr>
      <td>
        {pays.nom}
        <br />
        <span className="muted small mono">{pays.code_pays}</span>
      </td>
      <td>
        <span className={`badge ${pays.esignature_reconnue ? "badge-ok" : "badge-mut"}`}>
          {pays.esignature_reconnue ? "Oui" : "Non"}
        </span>
      </td>
      <td>
        <button
          type="button"
          className={`pill ${pays.manuel_requis ? "pill-on" : "pill-off"}`}
          disabled={busy}
          onClick={() => void patch({ manuel_requis: !pays.manuel_requis })}
        >
          {pays.manuel_requis ? "Requise" : "Non requise"}
        </button>
      </td>
      <td>
        <input
          className="search"
          style={{ minWidth: 160 }}
          value={source}
          disabled={busy}
          onChange={(e) => setSource(e.target.value)}
          onBlur={saveSource}
          placeholder="Référence"
        />
      </td>
      <td>
        <input
          className="search"
          style={{ minWidth: 200 }}
          value={note}
          disabled={busy}
          onChange={(e) => setNote(e.target.value)}
          onBlur={saveNote}
          placeholder="Note"
        />
      </td>
    </tr>
  );
}
