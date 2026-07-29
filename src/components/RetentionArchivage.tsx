import { useEffect, useState } from "react";

import { type RetentionConfig, type RetentionEtat, type RetentionJournalItem, type RetentionRapport, executerRetention, getRetentionEtat, getRetentionJournal, setRetentionConfig } from "../api.js";
import { usePagination } from "../usePagination.js";
import { Pagination } from "./Pagination.js";

/**
 * Parametres > Communication > Retention et archivage.
 *
 * Distinct policies for Informations, Notifications and Telegram. Deletion is OFF
 * by default (a two-step lifecycle: archive, then optional deletion) so nothing is
 * ever destroyed silently. The Telegram section states the REAL bot capability,
 * never a misleading promise. Every run is journaled and previewable (simulation).
 */
export function RetentionArchivage({ token, canGerer }: Readonly<{ token: string; canGerer: boolean }>): JSX.Element {
  const [etat, setEtat] = useState<RetentionEtat | null>(null);
  const [cfg, setCfg] = useState<RetentionConfig | null>(null);
  const [journal, setJournal] = useState<RetentionJournalItem[]>([]);
  const [rapport, setRapport] = useState<RetentionRapport | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const charger = (): void => {
    void getRetentionEtat(token).then((e) => { setEtat(e); setCfg(e.config); }).catch((x) => setErr(String(x?.message ?? x)));
    void getRetentionJournal(token, 30, 0).then((j) => setJournal(j.items)).catch(() => undefined);
  };
  useEffect(charger, [token]);

  function champ<K extends keyof RetentionConfig>(k: K, v: RetentionConfig[K]): void {
    setCfg((c) => (c ? { ...c, [k]: v } : c));
  }

  async function run(fn: () => Promise<void>): Promise<void> {
    setBusy(true); setErr(null); setMsg(null);
    try { await fn(); } catch (e) { setErr(e instanceof Error ? e.message : "Erreur"); } finally { setBusy(false); }
  }

  const num = (k: keyof RetentionConfig, label: string, aide: string, min = 0): JSX.Element => (
    <label className="field">
      <span>{label}</span>
      <input type="number" min={min} value={cfg ? Number(cfg[k]) : 0} disabled={!canGerer}
        onChange={(e) => champ(k, Number(e.target.value) as never)} />
      <small className="muted">{aide}</small>
    </label>
  );

  if (!cfg || !etat) {
    return (
      <div className="page">
        <header className="page-head"><h1>Rétention et archivage</h1></header>
        <section className="card"><p className="muted">{err ?? "Chargement..."}</p></section>
      </div>
    );
  }

  const tc = etat.telegram_capacite;

  const pagination = usePagination(journal, 10);

  return (
    <div className="page">
      <header className="page-head">
        <h1>Rétention et archivage</h1>
        <p className="muted">Classement, archivage et nettoyage des communications. La suppression définitive reste désactivée par défaut: rien n'est effacé sans une décision explicite.</p>
      </header>

      {err && <div className="banner-error">{err}</div>}
      {msg && <div className="banner-info">{msg}</div>}

      <section className="card">
        <h2>A. Informations importantes</h2>
        <div className="grid-2">
          {num("retention_info_archive_mois", "Archiver après (mois)", "Une information envoyée plus ancienne est archivée. Les informations protégées, institutionnelles ou épinglées sont exclues.", 1)}
          {num("retention_info_suppression_mois", "Supprimer après archivage (mois)", "0 = conservée. La suppression n'a lieu que si la suppression automatique est activée ci-dessous.")}
        </div>
      </section>

      <section className="card">
        <h2>B. Notifications</h2>
        <div className="grid-2">
          {num("retention_notif_lues_jours", "Archiver les notifications lues après (jours)", "Défaut 90 jours.", 1)}
          {num("retention_notif_nonlues_jours", "Archiver les non lues après (jours)", "Défaut 180 jours.", 1)}
          {num("retention_notif_suppression_mois", "Supprimer les archivées après (mois)", "Les notifications de sécurité ne sont jamais supprimées.")}
        </div>
      </section>

      <section className="card">
        <h2>C. Suppression automatique</h2>
        <label className="switch-row">
          <input type="checkbox" checked={cfg.retention_auto_suppression} disabled={!canGerer}
            onChange={(e) => champ("retention_auto_suppression", e.target.checked)} />
          <span>Autoriser la suppression définitive après archivage</span>
        </label>
        <p className="muted small">Désactivé par défaut. Tant que cette option est désactivée, le système archive seulement et ne supprime jamais. L'archivage précède toujours toute suppression, et chaque action est journalisée.</p>
      </section>

      <section className="card">
        <h2>D. Telegram</h2>
        <div className="grid-2">
          {num("telegram_retention_jours", "Fenêtre d'affichage Telegram (jours)", "Durée fonctionnelle côté ADSUM. Ce n'est PAS une garantie de suppression Telegram.", 1)}
        </div>
        <div className="info-tg">
          <p><strong>Capacité réelle du bot</strong></p>
          <ul>
            <li>Règle demandée: {tc.retention_configuree_jours} jours.</li>
            <li>Fenêtre technique de suppression par le bot: environ {tc.fenetre_suppression_bot_heures} heures.</li>
            <li>Messages actuellement éligibles au nettoyage: {tc.messages_eligibles}.</li>
          </ul>
          <p className="muted small">{tc.note}</p>
        </div>
      </section>

      {canGerer && (
        <section className="card">
          <h2>Actions</h2>
          <div className="row-actions">
            <button type="button" className="btn btn-ghost" disabled={busy}
              onClick={() => void run(async () => { await setRetentionConfig(token, cfg); setMsg("Paramètres enregistrés."); charger(); })}>
              Enregistrer les paramètres
            </button>
            <button type="button" className="btn btn-ghost" disabled={busy}
              onClick={() => void run(async () => { const r = await executerRetention(token, true); setRapport(r); setMsg("Simulation effectuée: aucune donnée modifiée."); })}>
              Simuler (aperçu)
            </button>
            <button type="button" className="btn btn-primary" disabled={busy}
              onClick={() => { if (window.confirm("Lancer le nettoyage maintenant ? L'archivage est appliqué. La suppression définitive n'a lieu que si vous l'avez activée.")) void run(async () => { const r = await executerRetention(token, false); setRapport(r); setMsg("Nettoyage exécuté."); charger(); }); }}>
              Lancer le nettoyage
            </button>
          </div>
          {rapport && (
            <div className="rapport">
              <p><strong>{rapport.simulation ? "Simulation" : "Exécution"}</strong> · suppression automatique {rapport.suppression_active ? "activée" : "désactivée"}</p>
              <ul>
                <li>Informations archivées: {rapport.informations_archivees} (protégées exclues: {rapport.informations_protegees}, supprimées: {rapport.informations_supprimees})</li>
                <li>Notifications archivées: {rapport.notifications_archivees} (supprimées: {rapport.notifications_supprimees})</li>
                <li>Messages Telegram traités: {rapport.telegram_traites}</li>
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="card">
        <h2>Journal de rétention</h2>
        {etat.derniere_execution && (
          <p className="muted small">Dernière exécution: {formatDate(etat.derniere_execution.execute_le)} ({etat.derniere_execution.resultat}). {etat.derniere_execution.rapport}</p>
        )}
        {journal.length === 0 ? (
          <p className="muted">Aucune entrée pour le moment.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Date</th><th>Type</th><th>Règle</th><th>Résultat</th><th>Détail</th><th>Acteur</th></tr></thead>
              <tbody>
                {pagination.page.map((j, i) => (
                  <tr key={`${j.execute_le}-${i}`}>
                    <td>{formatDate(j.execute_le)}</td>
                    <td>{j.type_element}</td>
                    <td>{j.regle}</td>
                    <td><span className={`tag tag-${j.resultat}`}>{j.resultat}</span></td>
                    <td>{j.titre ?? (j.destinataires != null ? `${j.destinataires} élément(s)` : (j.rapport ?? ""))}</td>
                    <td className="muted">{j.acteur}</td>
                  </tr>
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
        libelle="entrées"
      />
          </div>
        )}
      </section>
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
