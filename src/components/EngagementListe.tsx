import { useMemo, useState } from "react";

import { ApiError, type EngagementInvitation, convertirEngagement, getEngagementInvitations } from "../api.js";
import { useResource } from "../useResource.js";
import { usePagination } from "../usePagination.js";
import { Pagination } from "./Pagination.js";

const SOURCE_LABEL: Record<string, string> = { qr: "QR code", manuel: "Saisie", import: "Import Excel" };

/**
 * Pending engagement leads with selection (one / many / all) and bulk conversion.
 * Converting a lead creates a real member registration (temp password sent) and
 * moves it out of this pending list, so the queue stays clean.
 */
export function EngagementListe({ token, onConverted }: { token: string; onConverted?: () => void }): JSX.Element {
  const leads = useResource(() => getEngagementInvitations(token, "en_attente"), [token]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const items = leads.data ?? [];
  const tousSelectionnes = useMemo(() => items.length > 0 && items.every((i) => sel.has(i.id)), [items, sel]);

  function toggle(id: string): void {
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleTous(): void {
    setSel(tousSelectionnes ? new Set() : new Set(items.map((i) => i.id)));
  }

  async function convertir(): Promise<void> {
    if (sel.size === 0) return;
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const r = await convertirEngagement(token, [...sel]);
      setMsg(`${r.convertis} compte${r.convertis > 1 ? "s" : ""} créé${r.convertis > 1 ? "s" : ""}${r.ignores.length ? `, ${r.ignores.length} ignoré(s)` : ""}.`);
      setSel(new Set());
      leads.reload();
      onConverted?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  function nomAffiche(i: EngagementInvitation): string {
    return `${i.prenoms ?? ""} ${i.nom ?? ""}`.trim() || "-";
  }

  const pagination = usePagination(items, 10);

  return (
    <div>
      <header className="page-head">
        <div>
          <h2 className="section-title">Invitations en attente</h2>
          <p className="muted small">
            Sélectionnez une, plusieurs ou toutes les personnes, puis convertissez-les : chaque personne reçoit un
            compte membre et son accès, et sort de cette liste.
          </p>
        </div>
        <button type="button" className="btn btn-primary btn-inline" disabled={busy || sel.size === 0} onClick={() => void convertir()}>
          {busy ? "Conversion..." : `Convertir la sélection (${sel.size})`}
        </button>
      </header>

      {error && <p className="banner banner-error">{error}</p>}
      {msg && <p className="banner banner-ok">{msg}</p>}
      {leads.error && <p className="banner banner-error">{leads.error}</p>}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 34 }}>
                <input type="checkbox" checked={tousSelectionnes} onChange={toggleTous} aria-label="Tout sélectionner" />
              </th>
              <th>Personne</th>
              <th>Téléphone</th>
              <th>Canal</th>
              <th>Reçu le</th>
              <th>Remerciement</th>
            </tr>
          </thead>
          <tbody>
            {leads.loading && <tr><td colSpan={6} className="muted">Chargement...</td></tr>}
            {!leads.loading && items.length === 0 && <tr><td colSpan={6} className="muted">Aucune invitation en attente.</td></tr>}
            {pagination.page.map((i) => (
              <tr key={i.id}>
                <td><input type="checkbox" checked={sel.has(i.id)} onChange={() => toggle(i.id)} aria-label={`Sélectionner ${i.email}`} /></td>
                <td>
                  <div className="event-main">
                    <strong>{nomAffiche(i)}</strong>
                    <span className="muted small">{i.email}</span>
                  </div>
                </td>
                <td className="muted small">{i.telephone ?? "-"}</td>
                <td><span className="badge badge-mut">{SOURCE_LABEL[i.source] ?? i.source}</span></td>
                <td className="small">{i.cree_le ? new Date(i.cree_le).toLocaleDateString("fr-FR") : "-"}</td>
                <td>
                  <span className={`badge ${i.remerciement_envoye ? "badge-ok" : "badge-mut"}`}>{i.remerciement_envoye ? "envoyé" : "-"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={pagination.numero}
        pages={pagination.pages}
        total={pagination.total}
        taille={pagination.taille}
        onPage={pagination.setNumero}
        onTaille={pagination.setTaille}
        libelle="engagements"
      />
    </div>
  );
}
